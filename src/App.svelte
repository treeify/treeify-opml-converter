<script lang="ts">
  import {
    convertDynalistOutlineElement,
    convertWorkFlowyOutlineElement,
    xmlDocumentToString,
  } from './convert'

  document.title = 'DynalistやWorkFlowyのOPMLをTreeify用に変換'

  type Outliner = 'Dynalist' | 'WorkFlowy'

  let selectedOutliner: Outliner = 'Dynalist'
  let inputAreaText = ''
  let outputAreaText = ''

  $: outputAreaText = convert(inputAreaText, selectedOutliner)

  function convert(inputText: string, selectedOutliner: Outliner): string {
    if (inputText === '') return ''

    switch (selectedOutliner) {
      case 'Dynalist': {
        const xmlDocument = new DOMParser().parseFromString(inputText, 'text/xml')
        if (xmlDocument.getElementsByTagName('parsererror').length > 0) {
          // パースエラー時
          return 'エラー：OPMLとして認識できません。'
        } else {
          for (const outlineElement of [...xmlDocument.getElementsByTagName('outline')]) {
            convertDynalistOutlineElement(xmlDocument, outlineElement)
          }
          return xmlDocumentToString(xmlDocument)
        }
      }
      case 'WorkFlowy': {
        // WindowsでWorkFlowyウェブ版のOPMLエクスポートを行うとなぜかXMLエスケープされない不具合への対策
        // TODO: 高速化の余地あり
        let escapedText = inputText
          .replaceAll('<b>', '&lt;b&gt;')
          .replaceAll('</b>', '&lt;/b&gt;')
          .replaceAll('<u>', '&lt;u&gt;')
          .replaceAll('</u>', '&lt;/u&gt;')
          .replaceAll('<i>', '&lt;i&gt;')
          .replaceAll('</i>', '&lt;/i&gt;')
        const xmlDocument = new DOMParser().parseFromString(escapedText, 'text/xml')
        if (xmlDocument.getElementsByTagName('parsererror').length > 0) {
          // パースエラー時
          return 'エラー：OPMLとして認識できません。'
        } else {
          for (const outlineElement of xmlDocument.getElementsByTagName('outline')) {
            convertWorkFlowyOutlineElement(xmlDocument, outlineElement)
          }
          return xmlDocumentToString(xmlDocument)
        }
      }
    }
  }
</script>

<main>
  <h1>OPMLをTreeify用に変換</h1>
  <form id="form">
    <div class="radio-button-area">
      <label>
        <input type="radio" bind:group={selectedOutliner} value="Dynalist" />
        Dynalist → Treeify
      </label>
      <label>
        <input type="radio" bind:group={selectedOutliner} value="WorkFlowy" />
        WorkFlowy → Treeify
      </label>
    </div>
    <div id="input-output-area">
      <label for="input-area">入力欄（変換前）</label>
      <label for="output-area">出力欄（変換後）</label>
      <textarea id="input-area" autofocus bind:value={inputAreaText} />
      <textarea id="output-area" bind:value={outputAreaText} />
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
