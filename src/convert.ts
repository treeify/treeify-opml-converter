import { marked, Renderer, Tokenizer } from 'marked'
import { assertNonNull } from './assert'

// Dynalistに合わせてMarkdownパーサーの挙動をカスタマイズする。
// __text__ を<strong>text</strong>の代わりに<em>text</em>と解釈させる。
class DynalistTokenizer extends Tokenizer<false> {
  emStrong(
    src: string,
    maskedSrc: string,
    prevChar: string
  ): marked.Tokens.Em | marked.Tokens.Strong | false {
    const result = /^__(.+)__/.exec(src)
    if (result === null) return false

    return {
      type: 'em',
      raw: result[0],
      text: result[1],
      tokens: [],
    }
  }
}

// Treeify（というよりChromeのcontenteditable）に合わせてMarkdown→HTML変換の挙動をカスタマイズする。
class DynalistRenderer extends Renderer<false> {
  strong(text: string): string {
    return `<b>${text}</b>`
  }
  em(text: string): string {
    return `<i>${text}</i>`
  }
  del(text: string): string {
    return `<strike>${text}</strike>`
  }
}

marked.use({ renderer: new DynalistRenderer(), tokenizer: new DynalistTokenizer() })

/**
 * Dynalistのoutline要素をTreeify向けのoutline要素に変換する。
 * ミューテーションするので戻り値はなし。
 */
export function convertDynalistOutlineElement(document: Document, outlineElement: Element) {
  const textAttribute = outlineElement.getAttribute('text')
  assertNonNull(textAttribute)

  const html = marked.parseInline(textAttribute)
  const documentFragment = parseHtml(html)

  // a要素をプレーンテキスト化する。
  // 例えば<a href="https://sample.com">リンク</a>は"リンク https://sample.com "に置換する。
  const anchorElements = documentFragment.querySelectorAll('a')
  for (const anchorElement of anchorElements) {
    if (anchorElement.text !== anchorElement.href) {
      anchorElement.replaceWith(...anchorElement.childNodes, ` ${anchorElement.href} `)
    } else {
      anchorElement.replaceWith(...anchorElement.childNodes)
    }
  }

  // img要素をプレーンテキスト化する
  const imageElements = documentFragment.querySelectorAll('img')
  for (const imageElement of imageElements) {
    if (imageElement.alt === '') {
      imageElement.replaceWith(imageElement.src)
    } else {
      imageElement.replaceWith(`${imageElement.alt} ${imageElement.src}`)
    }
  }

  // サポート外のタグを全て削除
  const otherElements = documentFragment.querySelectorAll('*')
  for (const element of otherElements) {
    if (!new Set(['b', 'u', 'i', 'strike']).has(element.tagName.toLowerCase())) {
      element.replaceWith(...element.childNodes)
    }
  }

  outlineElement.setAttribute('html', toHtml(documentFragment))

  // 完了状態を変換する
  const completeAttribute = outlineElement.getAttribute('complete')
  if (completeAttribute === 'true') {
    outlineElement.setAttribute('cssClass', 'completed')
  }

  // ノート（_note属性）が付いている場合は対応する子項目を作成する
  const noteAttribute = outlineElement.getAttribute('_note')
  if (noteAttribute !== null) {
    const newElement = document.createElement('outline')
    newElement.setAttribute('text', noteAttribute)
    outlineElement.prepend(newElement)

    // Treeifyにとっては不要な属性なので削除（削除しなくても動作は変わらない）
    outlineElement.removeAttribute('_note')
  }
}

/**
 * WorkFlowyのoutline要素をTreeify向けのoutline要素に変換する。
 * ミューテーションするので戻り値はなし。
 */
export function convertWorkFlowyOutlineElement(document: Document, outlineElement: Element) {
  const textAttribute = outlineElement.getAttribute('text')
  assertNonNull(textAttribute)

  const documentFragment = parseHtml(textAttribute)

  // a要素をプレーンテキスト化する。
  // 例えば<a href="https://sample.com">リンク</a>は"リンク https://sample.com "に置換する。
  const anchorElements = documentFragment.querySelectorAll('a')
  for (const anchorElement of anchorElements) {
    if (anchorElement.text !== anchorElement.href) {
      anchorElement.replaceWith(...anchorElement.childNodes, ` ${anchorElement.href} `)
    } else {
      anchorElement.replaceWith(...anchorElement.childNodes)
    }
  }

  // img要素をプレーンテキスト化する
  const imageElements = documentFragment.querySelectorAll('img')
  for (const imageElement of imageElements) {
    if (imageElement.alt === '') {
      imageElement.replaceWith(imageElement.src)
    } else {
      imageElement.replaceWith(`${imageElement.alt} ${imageElement.src}`)
    }
  }

  // サポート外のタグを全て削除
  const otherElements = documentFragment.querySelectorAll('*')
  for (const element of otherElements) {
    if (!new Set(['b', 'u', 'i', 'strike']).has(element.tagName.toLowerCase())) {
      element.replaceWith(...element.childNodes)
    }
  }

  outlineElement.setAttribute('html', toHtml(documentFragment))

  // 完了状態を変換する
  const completeAttribute = outlineElement.getAttribute('_complete')
  if (completeAttribute === 'true') {
    outlineElement.setAttribute('cssClass', 'completed')
  }

  // ノート（_note属性）が付いている場合は対応する子項目を作成する
  const noteAttribute = outlineElement.getAttribute('_note')
  if (noteAttribute !== null) {
    const newElement = document.createElement('outline')
    newElement.setAttribute('text', noteAttribute)
    outlineElement.prepend(newElement)

    // Treeifyにとっては不要な属性なので削除（削除しなくても動作は変わらない）
    outlineElement.removeAttribute('_note')
  }
}

export function xmlDocumentToString(document: Document): string {
  const xmlString = new XMLSerializer().serializeToString(document.documentElement)
  // XML宣言が付いていない場合は付ける
  if (xmlString.startsWith('<?xml')) {
    return xmlString
  } else {
    return '<?xml version="1.0"?>\n' + xmlString
  }
}

function parseHtml(html: string): DocumentFragment {
  const templateElement = document.createElement('template')
  templateElement.innerHTML = html
  return templateElement.content
}

function toHtml(documentFragment: DocumentFragment): string {
  const dummy = document.createElement('dummy')
  dummy.append(documentFragment)
  return dummy.innerHTML
}
