import './style.css'
import {assertNonNull} from './assert'

const inputArea = document.querySelector<HTMLTextAreaElement>('#input-area')
assertNonNull(inputArea)
const outputArea = document.querySelector<HTMLTextAreaElement>('#output-area')
assertNonNull(outputArea)

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
      convertOutlineElement(document, outlineElement)
    }

    outputArea.value = xmlDocumentToString(document)

    // 変換に成功したので出力欄にフォーカスを移す
    outputArea.focus({preventScroll: true})
    outputArea.setSelectionRange(0, 0)
  }
})

// WorkFlowyのoutline要素をTreeify向けのoutline要素に変換する。
// ミューテーションするので戻り値はなし。
function convertOutlineElement(document: Document, outlineElement: Element) {
  const textAttribute = outlineElement.getAttribute('text')
  assertNonNull(textAttribute)

  const documentFragment = parseHtml(textAttribute)
  const anchorElements = documentFragment.querySelectorAll('a')
  if (anchorElements.length === 1) {
    const anchorElement = anchorElements.item(0)
    if (documentFragment.childNodes.length === 1) {
      // パターン1「<a>...</a>」
      outlineElement.setAttribute('type', 'link')
      outlineElement.setAttribute('text', anchorElement.text)
      outlineElement.setAttribute('url', anchorElement.href)
    } else {
      const index = [...documentFragment.childNodes].indexOf(anchorElement)
      if (index === documentFragment.childNodes.length - 1) {
        // パターン2「テキスト <a>...</a>」
        documentFragment.removeChild(anchorElement)
        const restHtml = toHtml(documentFragment).trim()
        outlineElement.setAttribute('text', restHtml)
        outlineElement.setAttribute('html', restHtml)

        const newElement = document.createElement('outline')
        newElement.setAttribute('type', 'link')
        newElement.setAttribute('text', anchorElement.text)
        newElement.setAttribute('url', anchorElement.href)
        outlineElement.prepend(newElement)
      } else if (index === 0) {
        // パターン3「<a>...</a> テキスト」
        outlineElement.setAttribute('type', 'link')
        outlineElement.setAttribute('text', anchorElement.text)
        outlineElement.setAttribute('url', anchorElement.href)

        documentFragment.removeChild(anchorElement)
        const restHtml = toHtml(documentFragment).trim()
        const newElement = document.createElement('outline')
        newElement.setAttribute('text', restHtml)
        newElement.setAttribute('html', restHtml)
        outlineElement.prepend(newElement)
      } else {
        // パターン4「テキスト <a>...</a> テキスト」や「<b><a>...</a></b>」など
        // 下手に変換しても逆によく分からなくなる恐れがあるのでそのまま出力する
      }
    }
  } else if (anchorElements.length >= 2) {
    // a要素が2つ以上ある場合は諦めてそのまま出力する
  } else {
    outlineElement.setAttribute('html', textAttribute)
  }

  // ノート（_note属性）が付いている場合は対応する子項目を作成する
  const noteAttribute = outlineElement.getAttribute('_note')
  if (noteAttribute !== null) {
    const lines = noteAttribute.split(/\r?\n/)
    for (const line of lines.reverse()) {
      const documentFragment = parseHtml(line)
      const anchorElements = documentFragment.querySelectorAll('a')
      const newElement = document.createElement('outline')
      if (anchorElements.length === 1) {
        const anchorElement = anchorElements.item(0)
        newElement.setAttribute('type', 'link')
        newElement.setAttribute('text', anchorElement.text)
        newElement.setAttribute('url', anchorElement.href)
      } else if (anchorElements.length >= 2) {
        newElement.setAttribute('text', line)
      } else {
        newElement.setAttribute('text', line)
        newElement.setAttribute('html', line)
      }
      outlineElement.prepend(newElement)
    }
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
