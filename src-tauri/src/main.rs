// Sem janela de console atrás do app na versão final (release)
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    krypta_lib::run()
}
