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
    for (const outlineElement of document.getElementsByTagName('outline')) {
      const textAttribute = outlineElement.getAttribute('text')
      assertNonNull(textAttribute)

      const documentFragment = parseHtml(textAttribute)
      const anchorElements = documentFragment.querySelectorAll("a")
      if (anchorElements.length === 1) {
        // a要素が1つだけある場合はウェブページ項目として扱う

        const anchorElement = anchorElements.item(0)

        if (documentFragment.childNodes.length === 1) {
          // パターン1「<a>...</a>」
          outlineElement.setAttribute("type", "link")
          outlineElement.setAttribute("text", anchorElement.text)
          outlineElement.setAttribute("url", anchorElement.href)
        } else {
          const index = [...documentFragment.childNodes].indexOf(anchorElement)
          if (index === documentFragment.childNodes.length - 1) {
            // パターン2「テキスト <a>...</a>」

          } else if (index === 0) {
            // パターン3「<a>...</a> テキスト」

          } else {
            // パターン4「テキスト <a>...</a> テキスト」

          }
        }
      } else {
        outlineElement.setAttribute('html', textAttribute)
      }
    }

    outputArea.value = xmlDocumentToString(document)
  }
})

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
