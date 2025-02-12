export default {
  import: ['features/step_definitions/**/*.ts', 'features/support/**/*.ts'],
  paths: ['features/**/*.feature'],
  format: ['@cucumber/pretty-formatter'],
  requireModule: ['ts-node/register'],
};
