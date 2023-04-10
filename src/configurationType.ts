export type Configuration = {
    /**
     * Wether to disable all errors, defined by `disableErrorTypes`.
     * @default false
     */
    disableAllErrors: boolean
    /**
     * Ignores `enable` setting.
     * @default false
     */
    // alwaysDisableSemanticOnMissingNodeModules: boolean
    /**
     * Which types of diagnostics to disable completely when `disableAllErrors` is enabled!
     * @default ["semantic"]
     */
    disableErrorTypes: ('syntactic' | 'semantic' | 'suggestion')[]
    /**
     * @default true
     */
    enableCustomizations: boolean
    /**
     * Similar to `eslint.rules.customizations`, can customize specific diagnostics. To turn off diagnostic, set severity to `off`
     * @default []
     */
    customizations: Array<{
        code?: number | number[]
        messageRegex?: string
        severity: 'error' | 'warning' | 'hint' | 'off'
        // todo-low also provide globs filter
    }>
    /**
     * Set to empty string to disable detection.
     * @default tsc-silent.config.js
     */
    tscSilentConfig: string
}
