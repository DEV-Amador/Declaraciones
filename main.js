const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');

// Mantener referencia global de la ventana
let mainWindow;

function createWindow() {
    // Crear la ventana del navegador
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true
        },
        icon: path.join(__dirname, 'assets/icon.png'),
                                   titleBarStyle: 'default',
                                   show: false // No mostrar hasta que esté listo
    });

    // Cargar el archivo HTML
    mainWindow.loadFile('index.html');

    // Mostrar ventana cuando esté lista
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();

        // Enfocar la ventana
        if (process.platform === 'darwin') {
            app.dock.show();
        }
    });

    // Emitido cuando la ventana se cierra
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Manejar links externos
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Solo en desarrollo: abrir DevTools
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
}

// Este método se llama cuando Electron ha terminado la inicialización
app.whenReady().then(createWindow);

// Salir cuando todas las ventanas estén cerradas
app.on('window-all-closed', () => {
    // En macOS es común que las apps permanezcan activas hasta que el usuario salga explícitamente
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // En macOS es común recrear la ventana cuando se hace clic en el ícono del dock
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Crear menú personalizado para macOS
if (process.platform === 'darwin') {
    const template = [
        {
            label: app.getName(),
            submenu: [
                { role: 'about', label: 'Acerca de Extractor Declaraciones' },
                { type: 'separator' },
                {
                    label: 'Servicios',
                    submenu: []
                },
                { type: 'separator' },
                { role: 'hide', label: 'Ocultar Extractor Declaraciones' },
                { role: 'hideothers', label: 'Ocultar Otros' },
                { role: 'unhide', label: 'Mostrar Todo' },
                { type: 'separator' },
                { role: 'quit', label: 'Salir de Extractor Declaraciones' }
            ]
        },
        {
            label: 'Archivo',
            submenu: [
                {
                    label: 'Abrir PDF...',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const result = await dialog.showOpenDialog(mainWindow, {
                            properties: ['openFile'],
                            filters: [
                                { name: 'Documentos PDF', extensions: ['pdf'] }
                            ]
                        });

                        if (!result.canceled && result.filePaths.length > 0) {
                            // Enviar ruta del archivo al renderer
                            mainWindow.webContents.send('file-selected', result.filePaths[0]);
                        }
                    }
                },
                { type: 'separator' },
                { role: 'close', label: 'Cerrar Ventana' }
            ]
        },
        {
            label: 'Editar',
            submenu: [
                { role: 'undo', label: 'Deshacer' },
                { role: 'redo', label: 'Rehacer' },
                { type: 'separator' },
                { role: 'cut', label: 'Cortar' },
                { role: 'copy', label: 'Copiar' },
                { role: 'paste', label: 'Pegar' },
                { role: 'selectall', label: 'Seleccionar Todo' }
            ]
        },
        {
            label: 'Ver',
            submenu: [
                { role: 'reload', label: 'Recargar' },
                { role: 'forceReload', label: 'Forzar Recarga' },
                { role: 'toggleDevTools', label: 'Herramientas de Desarrollador' },
                { type: 'separator' },
                { role: 'resetZoom', label: 'Zoom Real' },
                { role: 'zoomin', label: 'Acercar' },
                { role: 'zoomout', label: 'Alejar' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: 'Pantalla Completa' }
            ]
        },
        {
            label: 'Ventana',
            submenu: [
                { role: 'minimize', label: 'Minimizar' },
                { role: 'zoom', label: 'Ampliar' },
                { type: 'separator' },
                { role: 'front', label: 'Traer Todo al Frente' }
            ]
        },
        {
            label: 'Ayuda',
            submenu: [
                {
                    label: 'Acerca de',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Extractor de Declaraciones Fiscales',
                            message: 'Extractor de Declaraciones Fiscales v1.0.0',
                            detail: 'Aplicación para extraer datos de declaraciones fiscales del SAT de manera completamente privada y local.',
                            buttons: ['OK']
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Prevenir la navegación a URLs externas
app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (navigationEvent, url) => {
        const parsedUrl = new URL(url);

        if (parsedUrl.origin !== 'file://') {
            navigationEvent.preventDefault();
        }
    });
});

// Configuración de seguridad
app.on('ready', () => {
    // Deshabilitar la navegación web
    app.on('web-contents-created', (event, contents) => {
        contents.on('will-attach-webview', (event, webPreferences, params) => {
            delete webPreferences.preload;
            delete webPreferences.preloadURL;
            webPreferences.nodeIntegration = false;
        });
    });
});
