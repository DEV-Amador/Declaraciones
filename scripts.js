
// Configurar PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const fileInput = document.getElementById('pdfFile');
const processBtn = document.getElementById('processBtn');
const statusDiv = document.getElementById('status');
const resultsDiv = document.getElementById('results');
const dataGrid = document.getElementById('dataGrid');

let selectedFile = null;

fileInput.addEventListener('change', (e) => {
    selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
        processBtn.disabled = false;
        showStatus('Archivo PDF seleccionado correctamente', 'success');
    } else {
        processBtn.disabled = true;
        showStatus('Por favor selecciona un archivo PDF válido', 'error');
    }
});

processBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    showStatus('Procesando PDF... Extrayendo texto...', 'loading');
    processBtn.disabled = true;

    try {
        const text = await extractTextFromPDF(selectedFile);
        const extractedData = extractDeclarationData(text);
        displayResults(extractedData);
        showStatus('¡Datos extraídos exitosamente!', 'success');
    } catch (error) {
        console.error('Error:', error);
        showStatus('Error al procesar el PDF: ' + error.message, 'error');
    } finally {
        processBtn.disabled = false;
    }
});

async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }

    return fullText;
}

function extractDeclarationData(text) {
    const data = {};

    // Extraer datos usando expresiones regulares basadas en el PDF de ejemplo
    const patterns = {
        tipoDeclaracion: /Tipo de declaración:\s*(\w+)/i,
        ejercicio: /Ejercicio:\s*(\d{4})/i,
        periodoDeclaracion: /Período de la declaración:\s*(\w+)/i,
        fechaHoraPresentacion: /Fecha y hora de presentación:\s*([0-9\/\s:]+)/i,
        numeroOperacion: /Número de operación:\s*(\d+)/i,
        ingresosCobradesMes: /INGRESOS COBRADOS DEL MES\s*[\s\S]*?(\d{1,3}(?:,\d{3})*)/i,
        ingresosMesesAnteriores: /INGRESOS DE MESES ANTERIORES\s*[\s\S]*?(\d{1,3}(?:,\d{3})*)/i,
        comprasGastosDeduciblesMes: /COMPRAS Y GASTOS DEDUCIBLES DEL\s*MES\s*[\s\S]*?(\d{1,3}(?:,\d{3})*)/i,
        comprasGastosMesesAnteriores: /COMPRAS Y GASTOS DE MESES\s*ANTERIORES.*?PAGADAS\s*[\s\S]*?(\d{1,3}(?:,\d{3})*)/i,
        totalISRRetenido: /TOTAL DE ISR RETENIDO\s*[\s\S]*?(\d{1,3}(?:,\d{3})*)/i,
        ISRRetenidoMes: /ISR RETENIDO DEL MES\s*[\s\S]*?(\d{1,3}(?:,\d{3})*)/i,
        impuestoACargo: /IMPUESTO A CARGO\s*[\s\S]*?(\d{1,3}(?:,\d{3})*)/i,
        pagosProvisionalesAnteriores: /PAGOS PROVISIONALES EFECTUADOS\s*CON ANTERIORIDAD[\s\S]*?(\d+)/i,
        cantidadACargo: /CANTIDAD A CARGO\s*[\s\S]*?(\d{1,3}(?:,\d{3})*)/i
    };

    // Extraer cada campo
    for (const [key, pattern] of Object.entries(patterns)) {
        const match = text.match(pattern);
        data[key] = match ? match[1].trim() : 'No encontrado';
    }

    return data;
}

function displayResults(data) {
    const fieldLabels = {
        tipoDeclaracion: 'Tipo de Declaración',
        ejercicio: 'Ejercicio',
        periodoDeclaracion: 'Período de la Declaración',
        fechaHoraPresentacion: 'Fecha y Hora de Presentación',
        numeroOperacion: 'Número de Operación',
        ingresosCobradesMes: 'Ingresos Cobrados del Mes',
        ingresosMesesAnteriores: 'Ingresos de Meses Anteriores',
        comprasGastosDeduciblesMes: 'Compras y Gastos Deducibles del Mes',
        comprasGastosMesesAnteriores: 'Compras y Gastos de Meses Anteriores',
        totalISRRetenido: 'Total de ISR Retenido',
        ISRRetenidoMes: 'ISR Retenido del Mes',
        impuestoACargo: 'Impuesto a Cargo (ISR)',
        pagosProvisionalesAnteriores: 'Pagos Provisionales Efectuados con Anterioridad',
        cantidadACargo: 'Cantidad a Cargo'
    };

    dataGrid.innerHTML = '';

    for (const [key, value] of Object.entries(data)) {
        const card = document.createElement('div');
        card.className = 'data-card';

        card.innerHTML = `
        <div class="data-label">${fieldLabels[key]}</div>
        <div class="data-value" onclick="copyToClipboard('${value}', this)">
        ${value}
        <button class="copy-btn" onclick="event.stopPropagation(); copyToClipboard('${value}', this.parentElement)">Copiar</button>
        </div>
        `;

        dataGrid.appendChild(card);
    }

    resultsDiv.style.display = 'block';
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function copyToClipboard(text, element) {
    navigator.clipboard.writeText(text).then(() => {
        const originalBg = element.style.background;
        element.style.background = '#c8e6c9';
        element.style.borderColor = '#4caf50';

        const copyBtn = element.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.textContent = '✓ Copiado';
            copyBtn.style.background = '#4caf50';
        }

        setTimeout(() => {
            element.style.background = originalBg;
            element.style.borderColor = '#e9ecef';
            if (copyBtn) {
                copyBtn.textContent = 'Copiar';
                copyBtn.style.background = '#2196F3';
            }
        }, 1500);
    }).catch(err => {
        console.error('Error al copiar:', err);
        showStatus('Error al copiar al portapapeles', 'error');
    });
}

function showStatus(message, type) {
    statusDiv.style.display = 'block';
    statusDiv.className = `status ${type}`;

    if (type === 'loading') {
        statusDiv.innerHTML = `<span class="loading-spinner"></span>${message}`;
    } else {
        statusDiv.innerHTML = message;
    }

    if (type !== 'loading') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
}
