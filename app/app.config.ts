// upstream: https://github.com/nuxt/nuxt/commit/8e27051ab427eaf048f08cece3f8d7f0e1711e64
const defineAppConfig = (x: any) => x;

export default defineAppConfig({
  ui: {
    colors: {
      primary: 'brand',
      secondary: 'brand',
      info: 'brand',
      success: 'green',
      warning: 'yellow',
      error: 'red',
      neutral: 'zinc',
    },

    formField: {
      variants: {
        orientation: {
          horizontal: {
            root: 'justify-start',
            container: 'flex',
          },
        },
      },
    },
  },
});
