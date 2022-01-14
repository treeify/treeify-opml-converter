<script lang="ts">
  import { marked } from 'marked'
  import { assertNonNull } from './assert'

  document.title = 'DynalistやWorkFlowyのOPMLをTreeify用に変換'

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
        tokens: [],
      } as const
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

  marked.use({ renderer, tokenizer })

  function onInput(event: InputEvent) {
    if (!(event.target instanceof HTMLTextAreaElement)) return

    const outputArea = document.querySelector<HTMLTextAreaElement>('#output-area')
    assertNonNull(outputArea)
    const form = document.querySelector<HTMLFormElement>('#form')
    assertNonNull(form)
    const xmlDocument = new DOMParser().parseFromString(event.target.value, 'text/xml')

    if (xmlDocument.getElementsByTagName('parsererror').length > 0) {
      // パースエラー時
      if (event.target.value !== '') {
        outputArea.value = 'エラー：OPMLとして認識できません。'
      } else {
        outputArea.value = ''
      }
    } else {
      for (const outlineElement of [...xmlDocument.getElementsByTagName('outline')]) {
        switch (form.outlinerName.value) {
          case 'Dynalist':
            convertDynalistOutlineElement(xmlDocument, outlineElement)
            break
          case 'WorkFlowy':
            convertWorkFlowyOutlineElement(xmlDocument, outlineElement)
            break
        }
      }

      outputArea.value = xmlDocumentToString(xmlDocument)
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
</script>

<main>
  <h1>OPMLをTreeify用に変換</h1>
  <form id="form">
    <div class="radio-button-area">
      <label>
        <input type="radio" name="outlinerName" value="Dynalist" checked />
        Dynalist → Treeify
      </label>
      <label>
        <input type="radio" name="outlinerName" value="WorkFlowy" />
        WorkFlowy → Treeify
      </label>
    </div>
    <div id="input-output-area">
      <label for="input-area">入力欄（変換前）</label>
      <label for="output-area">出力欄（変換後）</label>
      <textarea id="input-area" autofocus on:input={onInput} />
      <textarea id="output-area" />
    </div>
    <div class="note">
      入力すると自動的に変換されます。<br
      />巨大なデータを入力するとしばらく応答がなくなる場合があります。
    </div>
  </form>
  <footer>
    <p>このツールはTreeifyの公式ツールです。<br />ソースコードは全てGitHubで公開されています。</p>
    <a href="https://github.com/treeify/treeify-opml-converter"
      >https://github.com/treeify/treeify-opml-converter</a
    >
  </footer>
</main>

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
  }

  :global(body) {
    /* lch(97.0%, 0.0, 0.0)相当 */
    background: #f6f6f6;
  }

  h1 {
    margin-inline: auto;
    width: max-content;

    padding-inline: 1.5em;
    /* lch(75.0%, 30.0, 160.4)相当 */
    border-bottom: #84c7a5 3px solid;

    margin-bottom: 1em;
  }

  main {
    margin: 20px auto;
    width: 90vw;

    border-radius: 10px;
    padding: 40px;
    background: #ffffff;

    /* lch(80.0%, 0.0, 0.0)相当 */
    box-shadow: 0 1.5px 5px #c6c6c6;
  }

  .radio-button-area {
    margin: 20px auto;
    width: max-content;

    display: flex;
    flex-direction: column;

    font-size: 1.2em;
  }

  #input-output-area {
    width: 100%;
    height: 400px;

    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto 1fr;
    column-gap: 20px;

    text-align: center;
  }

  #input-output-area label {
    font-size: 1.2em;
    /* lch(50.0%, 0.0, 0.0)相当 */
    color: #777777;
  }

  #input-area,
  #output-area {
    white-space: nowrap;

    /* lch(75.0%, 20.0, 280.4)相当 */
    outline-color: #acb8dd;
    /* lch(75.0%, 0.0, 0.0)相当 */
    border: #b9b9b9 1px solid;

    /* lch(85.0%, 0.0, 0.0)相当 */
    box-shadow: 0 0 4px #d4d4d4 inset;

    resize: none;

    margin-inline: 15px;
    padding: 0.5em;
  }

  #output-area {
    /* lch(98.0%, 0.0, 0.0) */
    background: #fafafa;
  }

  .note {
    margin: 20px auto;
    width: max-content;

    font-size: 0.9em;
    /* lch(40.0%, 0.0, 0.0)相当 */
    color: #5e5e5e;
  }

  footer {
    margin-left: auto;
    width: max-content;

    margin-top: 100px;

    font-size: 0.7em;
    /* lch(60.0%, 0.0, 0.0)相当 */
    color: #919191;
  }
  footer a {
    color: inherit;
  }
</style>
