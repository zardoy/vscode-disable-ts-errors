import * as vscode from 'vscode'
import { getExtensionCommandId, getExtensionSetting, registerExtensionCommand, updateExtensionSetting } from 'vscode-framework'
import { watchExtensionSetting } from '@zardoy/vscode-utils/build/settings'

export const activate = async () => {
    const tsExtension = vscode.extensions.getExtension('vscode.typescript-language-features')
    if (!tsExtension) {
        console.warn("disable-ts-errors won't work as vscode.typescript-language-features is not active")
        return
    }

    await tsExtension.activate()

    if (!tsExtension.exports || !tsExtension.exports.getAPI?.(0)) throw new Error('No exported TS API')

    const api = tsExtension.exports.getAPI(0)

    const IDS_PREFIX = process.env.IDS_PREFIX!
    const sync = (additionalConfig = {}) => {
        api.configurePlugin('disable-ts-errors', {
            ...vscode.workspace.getConfiguration().get(IDS_PREFIX),
            reloadTscSilentConfig: false,
            ...additionalConfig,
        })
    }
    sync()
    vscode.workspace.onDidChangeConfiguration(async ({ affectsConfiguration }) => {
        if (affectsConfiguration(IDS_PREFIX)) {
            sync({
                updateFiles: vscode.window.visibleTextEditors.map(({ document: { uri } }) =>
                    uri.scheme === 'file' ? uri.fsPath : `^/${uri.scheme}/${uri.authority || 'ts-nul-authority'}/${uri.path.replace(/^\//, '')}`,
                ),
            })
        }
    })

    const statusBarItem = vscode.window.createStatusBarItem('main-toggle', vscode.StatusBarAlignment.Left, -999)
    statusBarItem.name = 'Disable TS Errors'
    const updateStatusbarText = () => {
        statusBarItem.text = `${getExtensionSetting('disableAllErrors') ? '$(close)' : '$(check)'} TS Errors`
    }
    updateStatusbarText()
    registerExtensionCommand('toggleDisableAllErrors' as never, () => {
        updateExtensionSetting('disableAllErrors', !getExtensionSetting('disableAllErrors'))
    })
    statusBarItem.command = {
        title: 'Toggle disable all errors',
        command: getExtensionCommandId('toggleDisableAllErrors' as never),
    }
    statusBarItem.show()
    watchExtensionSetting('disableAllErrors', updateStatusbarText)

    vscode.workspace.onDidSaveTextDocument(document => {
        const tscSilentConfig = getExtensionSetting('tscSilentConfig')
        if (!tscSilentConfig) return
        if (
            // vscode.languages.match(
            //     {
            //         pattern: tscSilentConfig,
            //     },
            //     document,
            // )
            document.uri.fsPath.endsWith(tscSilentConfig)
        ) {
            sync({
                reloadTscSilentConfig: true,
            })
        }
    })
}
