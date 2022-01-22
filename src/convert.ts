import { toHtml } from 'hast-util-to-html'
import { fromMarkdown } from 'mdast-util-from-markdown'
import type { Content } from 'mdast-util-from-markdown/lib'
import { gfmStrikethroughFromMarkdown } from 'mdast-util-gfm-strikethrough'
import { toHast } from 'mdast-util-to-hast'
import { gfmStrikethrough } from 'micromark-extension-gfm-strikethrough'
import { assertNonNull } from './assert'

function parseDynalistMarkdown(markdown: string): string {
  const tree = fromMarkdown(markdown, {
    extensions: [gfmStrikethrough()],
    mdastExtensions: [gfmStrikethroughFromMarkdown],
  })
  tree.children.map(convertDoubleUnderscoreToEm)

  return toHtml(toHast(tree)!)

  // Dynalistは__text__を斜体として扱っている。
  // 一方標準のMarkdownは__text__を<strong>text</strong>として解釈する。
  // なのでAST上でstrongをemに変換する。
  // （Treeify的には<i>text</i>にしたいが、このライブラリでは直接そこまではできなさそう）
  function convertDoubleUnderscoreToEm(content: Content) {
    if (content.type === 'paragraph') {
      content.children.map(convertDoubleUnderscoreToEm)
    } else if (content.type === 'strong') {
      const offset = content.position?.start?.offset
      if (offset !== undefined) {
        if (markdown.slice(offset, offset + 2) === '__') {
          // @ts-ignore
          content.type = 'emphasis'
        }
      }
    }
  }
}

/**
 * Dynalistのoutline要素をTreeify向けのoutline要素に変換する。
 * ミューテーションするので戻り値はなし。
 */
export function convertDynalistOutlineElement(document: Document, outlineElement: Element) {
  const textAttribute = outlineElement.getAttribute('text')
  assertNonNull(textAttribute)

  const html = parseDynalistMarkdown(textAttribute)
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

  modifyElementName(documentFragment, 'strong', 'b')
  modifyElementName(documentFragment, 'em', 'i')
  modifyElementName(documentFragment, 'del', 's')

  // サポート外のタグを全て削除
  const otherElements = documentFragment.querySelectorAll('*')
  for (const element of otherElements) {
    if (!new Set(['b', 'u', 'i', 's']).has(element.tagName.toLowerCase())) {
      element.replaceWith(...element.childNodes)
    }
  }

  outlineElement.setAttribute('html', toHtmlString(documentFragment))

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

function modifyElementName(
  documentFragment: DocumentFragment,
  before: keyof HTMLElementTagNameMap,
  after: keyof HTMLElementTagNameMap
) {
  const beforeElements = documentFragment.querySelectorAll(before)
  for (const beforeElement of beforeElements) {
    const afterElement = document.createElement(after)
    afterElement.replaceChildren(...beforeElement.childNodes)
    beforeElement.replaceWith(afterElement)
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
    if (!new Set(['b', 'u', 'i', 's']).has(element.tagName.toLowerCase())) {
      element.replaceWith(...element.childNodes)
    }
  }

  outlineElement.setAttribute('html', toHtmlString(documentFragment))

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

function toHtmlString(documentFragment: DocumentFragment): string {
  const dummy = document.createElement('dummy')
  dummy.append(documentFragment)
  return dummy.innerHTML
}
