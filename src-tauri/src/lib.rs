// ============================================================
// KRYPTA DESKTOP
// A interface é o front React (o mesmo do site). Ele fala direto com a
// API (VITE_API_URL), então conta, plano, compras e cofre são os mesmos
// do site: mesmo servidor, mesmo banco.
// ============================================================
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut app = tauri::Builder::default();

    // Precisa ser o primeiro plugin: abrir o Krypta de novo foca a janela que já existe
    #[cfg(desktop)]
    {
        app = app.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(janela) = app.get_webview_window("main") {
                let _ = janela.unminimize();
                let _ = janela.show();
                let _ = janela.set_focus();
            }
        }));
    }

    app.plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Krypta");
}
