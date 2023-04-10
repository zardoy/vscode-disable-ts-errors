# VS Code Disable TS Errors

Disable / configure TypeScript diagnostics.

## Usage examples

### Toggle

This was mainly created for easy reading just-cloned repos that don't have dependencies installed yet (so you don't have bunch of red lines). That's why there is statusbar item that can toggle `disableTsErrors.disableAllErrors` setting.

### Per-diagnostic configuration

For projects without typechecking (without jsconfig, js only) you can use `disableTsErrors.customizations` to disable specific, similar how you can override eslint rules reporting with `eslint.rules.customizations`.

Also you can use this setting to disable refactoring hints, such as suggestions for unused variables. Or change severity of errors to warning or hint?

### Using with tsc-silent

If you still really need to disable specific errors in type-checked projects for some reason, you should use this along with [tsc-silent](https://www.npmjs.com/package/tsc-silent). Support for `tsc-silent` is enabled out of the box when the file with the name `tsc-silent.config.js` is found in the root (can be changed via setting).
