import './style.css'
import {assertNonNull} from './assert'
import marked from 'marked'

document.title = 'WorkFlowyやDynalistのOPMLをTreeify用に変換'

const form = document.querySelector<HTMLFormElement>('#form')
assertNonNull(form)
const inputArea = document.querySelector<HTMLTextAreaElement>('#input-area')
assertNonNull(inputArea)
const outputArea = document.querySelector<HTMLTextAreaElement>('#output-area')
assertNonNull(outputArea)

// Dynalistに合わせてMarkdownパーサーの挙動をカスタマイズする。
// __text__ を<strong>text</strong>の代わりに<em>text</em>と解釈させる。
const tokenizer = {
  emStrong(src: string, maskedSrc: string, prevChar: string) {
    const result = /^__(.+)__/.exec(src)
    if (result === null) return false

    return {
      type: 'em',
      raw: result[0],
      text: result[1],
    }
  },
}
// Treeify（というよりChromeのcontenteditable）に合わせてMarkdown→HTML変換の挙動をカスタマイズする。
const renderer = {
  strong(text: string) {
    return `<b>${text}</b>`
  },
  em(text: string) {
    return `<i>${text}</i>`
  },
  del(text: string) {
    return `<strike>${text}</strike>`
  },
}
marked.use({tokenizer, renderer} as any)

inputArea.addEventListener('input', () => {
  const document = new DOMParser().parseFromString(inputArea.value, 'text/xml')
  if (document.getElementsByTagName('parsererror').length > 0) {
    // パースエラー時
    if (inputArea.value !== '') {
      outputArea.value = 'エラー：OPMLとして認識できません。'
    } else {
      outputArea.value = ''
    }
  } else {
    for (const outlineElement of [...document.getElementsByTagName('outline')]) {
      switch (form.outlinerName.value) {
        case 'WorkFlowy':
          convertWorkFlowyOutlineElement(document, outlineElement)
          break
        case 'Dynalist':
          convertDynalistOutlineElement(document, outlineElement)
          break
      }
    }

    outputArea.value = xmlDocumentToString(document)

    // 変換に成功したので出力欄にフォーカスを移す
    outputArea.focus({preventScroll: true})
    outputArea.setSelectionRange(0, 0)
  }
})

// WorkFlowyのoutline要素をTreeify向けのoutline要素に変換する。
// ミューテーションするので戻り値はなし。
function convertWorkFlowyOutlineElement(document: Document, outlineElement: Element) {
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

  outlineElement.setAttribute('html', toHtml(documentFragment))

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

// Dynalistのoutline要素をTreeify向けのoutline要素に変換する。
// ミューテーションするので戻り値はなし。
function convertDynalistOutlineElement(document: Document, outlineElement: Element) {
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

  outlineElement.setAttribute('html', toHtml(documentFragment))

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

function xmlDocumentToString(document: Document): string {
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
