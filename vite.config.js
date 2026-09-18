import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import { defineConfig } from 'vite';

/**
 * @see https://vite.dev/config/
 * @type {import("vite").UserConfig}
 *
 * @see https://vite.dev/config/#conditional-config
 *
 * ! *** aliases ***
 * @see https://vite.dev/config/shared-options.html#resolve-alias
 * @see https://medium.com/@pushplaybang/absolutely-dont-use-relative-paths-imports-in-your-vite-react-project-c8593f93bbea
 *
 * ! *** https ***
 * https://vitejs.dev/config/server-options
 * https://laracasts.com/discuss/channels/vite/how-to-run-a-vite-project-over-https-and-accessible-by-local-network
 *
 * ! *** testing ***
 * @see https://vitest.dev/guide/
 * @see https://vitest.dev/config/
 * @see https://vitest.dev/guide/coverage.html
 * @see https://vitest.dev/guide/ui.html
 * @see https://testing-library.com/docs/react-testing-library/intro
 * @see https://github.com/testing-library/jest-dom
 * @see https://testing-library.com/docs/user-event/intro
 */
export default defineConfig(({ command, mode }) => {
  const baseConfig = {
    plugins: [tailwindcss()],
    envDir: './env',
    resolve: {
      alias: {
        apis: '/src/apis',
        configs: '/src/configs',
        features: '/src/features',
        hooks: '/src/hooks',
        pages: '/src/pages',
        utils: '/src/utils',
        store: '/src/store',
        testing: '/src/__testing__',
      },
    },
    css: {
      modules: {
        localsConvention: 'camelCaseOnly',
      },
      preprocessorOptions: {
        scss: {
          // enabled due to bootstrap
          // ` https://sass-lang.com/documentation/breaking-changes/import/
          quietDeps: true,

          // silenced due to bootstrap not yet supporting @use
          // ` https://sass-lang.com/documentation/breaking-changes/import/
          silenceDeprecations: ['import'],
        },
      },
    },
    test: {
      globals: false,
      environment: 'jsdom',
      setupFiles: ['./vitest-setup.js'],
      include: ['**/*.test.{js,jsx}'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{js,jsx}'],
        exclude: ['**/__mocks__/*.*', 'src/__testing__/**/*.*'],
        clean: true,
        cleanOnRerun: true,
        reportsDirectory: './coverage',
        reporter: ['text', 'json', 'lcov', 'clover'],
        reportOnFailure: true,
      },
      restoreMocks: true,
      css: false,
    },
  };

  let finalConfig = { ...baseConfig };

  // if we are in test mode, we do not want the react compiler included
  // it causes issues with coverage: https://github.com/facebook/react/issues/32950
  // otherwise, we want to include it
  if (mode === 'test') {
    finalConfig.plugins.push(react());
  } else {
    finalConfig.plugins.push(react({ babel: { plugins: ['babel-plugin-react-compiler'] } }));
  }

  // if we are serving the app (not testing), we want to use https
  // setup https and reference our cert files
  if (command === 'serve' && mode !== 'test') {
    const server = {
      port: 3000,
      strictPort: true,
      https: {
        key: fs.readFileSync('.cert/localhost-key.pem'),
        cert: fs.readFileSync('.cert/localhost-cert.pem'),
      },
    };

    finalConfig = { ...finalConfig, server };
  }

  return finalConfig;
});
