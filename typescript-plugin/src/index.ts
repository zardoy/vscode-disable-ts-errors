import type ts from 'typescript/lib/tsserverlibrary'
import { join } from 'path-browserify'

//@ts-ignore
import { Configuration } from '../../src/configurationType'

export = function ({ typescript: ts }: { typescript: typeof import('typescript/lib/tsserverlibrary') }) {
    const config = {} as Partial<Configuration> & { updateFiles?: string; reloadTscSilentConfig?: boolean }
    let info: ts.server.PluginCreateInfo
    // set to null to skip fs checks
    let tscSilentConfig = undefined as
        | {
              path: string
              module: {
                  suppress: Array<{
                      codes: number[]
                      pathRegExp?: string
                  }>
              }
          }
        | undefined
        | null
    return {
        create(_info: ts.server.PluginCreateInfo) {
            info = _info
            Object.assign(config, info.config)
            const { languageService } = info

            // Set up decorator object
            const proxy: ts.LanguageService = Object.create(null)

            for (const k of Object.keys(info.languageService)) {
                const x = info.languageService[k]!
                // @ts-expect-error - JS runtime trickery which is tricky to type tersely
                proxy[k] = (...args: Array<Record<string, unknown>>) => x.apply(info.languageService, args)
            }

            const filterSpecific = <T extends ts.Diagnostic>(diagnostics: T[], fileName: string): T[] => {
                if (!tscSilentConfig) {
                    // disable for non-configured projects?
                    const tscConfigFile = join(info.languageServiceHost.getCurrentDirectory(), config.tscSilentConfig)
                    if (config.tscSilentConfig && info.languageServiceHost.fileExists(tscConfigFile))
                        tscSilentConfig = {
                            path: require.resolve(tscConfigFile),
                            module: require(tscConfigFile),
                        }
                    else tscSilentConfig = null
                }
                if (Array.isArray(tscSilentConfig?.module.suppress)) {
                    diagnostics = diagnostics.filter(diagnostic => {
                        const config = tscSilentConfig!.module.suppress
                        if (
                            config.some(c => {
                                if (c.pathRegExp && !new RegExp(c.pathRegExp).test(fileName)) return false
                                if (!c.codes.includes(diagnostic.code)) return false
                                return true
                            })
                        ) {
                            return false
                        }
                        return true
                    })
                }
                if (!config.enableCustomizations) return diagnostics
                return diagnostics.filter(diagnostic => {
                    const overrideCustomization = config.customizations?.find(c => {
                        if (c.code !== undefined && Array.isArray(c.code) ? !c.code.includes(diagnostic.code) : c.code !== diagnostic.code) return false
                        if (
                            c.messageRegex &&
                            !new RegExp(c.messageRegex).test(
                                typeof diagnostic.messageText === 'object' ? diagnostic.messageText.messageText : diagnostic.messageText,
                            )
                        ) {
                            return false
                        }
                        return true
                    })
                    if (!overrideCustomization) return true
                    const overrideSeverity = overrideCustomization.severity
                    if (overrideSeverity === 'off') return false
                    diagnostic.category =
                        overrideSeverity === 'error'
                            ? ts.DiagnosticCategory.Error
                            : overrideSeverity === 'warning'
                            ? ts.DiagnosticCategory.Warning
                            : overrideSeverity === 'hint'
                            ? ts.DiagnosticCategory.Suggestion
                            : diagnostic.category
                    return true
                })
            }

            const disableCompletely = (type: Configuration['disableErrorTypes'][number]) => {
                // if (
                //     type === 'semantic' &&
                //     config.alwaysDisableSemanticOnMissingNodeModules &&
                //     info.project?.projectKind !== ts.server.ProjectKind.Inferred &&
                //     info.languageServiceHost.directoryExists?.(join(info.languageServiceHost.getCurrentDirectory(), 'node_modules'))
                // ) {
                //     return true
                // }
                if (config.disableAllErrors && config.disableErrorTypes?.includes(type)) return true
                return false
            }

            proxy.getSemanticDiagnostics = fileName => {
                if (disableCompletely('semantic')) return []
                const prior = languageService.getSemanticDiagnostics(fileName)
                return filterSpecific(prior, fileName)
            }

            proxy.getSyntacticDiagnostics = fileName => {
                if (disableCompletely('syntactic')) return []
                const prior = languageService.getSyntacticDiagnostics(fileName)
                return filterSpecific(prior, fileName)
            }

            proxy.getSuggestionDiagnostics = fileName => {
                if (disableCompletely('suggestion')) return []
                const prior = languageService.getSuggestionDiagnostics(fileName)
                return filterSpecific(prior, fileName)
            }

            return proxy
        },
        onConfigurationChanged(_config: any) {
            Object.assign(config, _config)
            const reloadTscSilentConfig = config.reloadTscSilentConfig || (tscSilentConfig && tscSilentConfig.path !== config.tscSilentConfig)
            if (reloadTscSilentConfig && tscSilentConfig) {
                delete require.cache[tscSilentConfig.path]
                tscSilentConfig = undefined
            }
            for (const updateFile of config.updateFiles ?? []) {
                if (!info.languageService.getProgram()!.getSourceFile(updateFile)) continue
                const session = info.session! as any
                try {
                    session.semanticCheck?.(updateFile, info.project)
                    session.syntacticCheck?.(updateFile, info.project)
                    session.suggestionCheck?.(updateFile, info.project)
                } catch (err) {
                    console.error(err)
                }
            }
        },
    }
}
