import sveltePreprocess from 'svelte-preprocess'
import postcssOKLabFunction from '@csstools/postcss-oklab-function'

export default {
  preprocess: sveltePreprocess({
    postcss: {
      plugins: [postcssOKLabFunction({ subFeatures: { displayP3: false } })],
    },
  }),
}
