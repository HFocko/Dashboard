import Papa from 'papaparse';
import Chart from 'chart.js/auto';

let distributionChart = null;
let trendChart = null;
let comparisonChart = null;
let currentPage = 1;
const rowsPerPage = 10;
let currentData = [];
let originalData = [];

// Función para cargar y analizar datos CSV
async function loadData(filename) {
    try {
        const response = await fetch(filename);
        const csvData = await response.text();
        return new Promise((resolve) => {
            Papa.parse(csvData, {
                header: true,
                complete: (results) => resolve(results.data),
                skipEmptyLines: true
            });
        });
    } catch (error) {
        console.error('Error al cargar datos:', error);
        return [];
    }
}

// Función para formatear números grandes
function formatNumber(number) {
    if (isNaN(number) || number === null || number === undefined) {
        return 'N/A';
    }
    return new Intl.NumberFormat('es-ES').format(number);
}

// Función para actualizar el total de registros
function updateTotalRecords(data) {
    const total = formatNumber(data.length);
    document.getElementById('totalRecords').innerHTML = `
        <div class="metric-value">${total}</div>
        <div class="metric-description">Total de registros en el conjunto de datos</div>
    `;
}

// Función para actualizar el promedio general
function updateAverageMetric(data, column) {
    const values = data.map(item => parseFloat(item[column])).filter(val => !isNaN(val));
    if (values.length === 0) {
        document.getElementById('averageMetric').innerHTML = `
            <div class="metric-value">N/A</div>
            <div class="metric-description">No hay datos disponibles para calcular el promedio</div>
        `;
        return;
    }
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    
    let description = '';
    if (column === 'release_year') {
        description = 'Año promedio de lanzamiento';
    } else if (column === 'Population') {
        description = 'Promedio de población afectada';
    } else if (column === 'math score') {
        description = 'Promedio de puntuación en matemáticas';
    } else {
        description = 'Promedio general';
    }
    
    document.getElementById('averageMetric').innerHTML = `
        <div class="metric-value">${formatNumber(average.toFixed(2))}</div>
        <div class="metric-description">${description}</div>
    `;
}

// Función para crear o actualizar el gráfico de distribución
function updateDistributionChart(data, label, values) {
    const ctx = document.getElementById('distributionChart');
    
    if (distributionChart) {
        distributionChart.destroy();
    }

    const counts = values.reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
    }, {});

    let title = '';
    if (label === 'tipo') {
        title = 'Distribución por Tipo de Contenido';
    } else if (label === 'Año') {
        title = 'Distribución por Año';
    } else if (label === 'gender') {
        title = 'Distribución por Género';
    } else {
        title = 'Distribución por Categoría';
    }

    distributionChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: [
                    '#2ecc71',
                    '#3498db',
                    '#9b59b6',
                    '#f1c40f',
                    '#e74c3c',
                    '#34495e',
                    '#16a085',
                    '#e67e22'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const percentage = ((value / values.length) * 100).toFixed(1);
                            return `${context.label}: ${formatNumber(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Función para crear o actualizar el gráfico de tendencias
function updateTrendChart(data, xAxis, yAxis) {
    const ctx = document.getElementById('trendChart');
    
    if (trendChart) {
        trendChart.destroy();
    }

    let title = '';
    let yAxisLabel = '';
    
    if (yAxis === 'duration') {
        title = 'Tendencia de Duración por Año';
        yAxisLabel = 'Duración (minutos)';
    } else if (yAxis === 'Population') {
        title = 'Tendencia de Población Afectada por Año';
        yAxisLabel = 'Población';
    } else if (yAxis === 'math score') {
        title = 'Tendencia de Puntuaciones de Matemáticas';
        yAxisLabel = 'Puntuación';
    } else {
        title = 'Tendencia de Datos';
        yAxisLabel = 'Valor';
    }

    // Filtrar y ordenar datos para el gráfico
    const filteredData = data.filter(item => 
        item[xAxis] && item[yAxis] && 
        !isNaN(parseFloat(item[xAxis])) && 
        !isNaN(parseFloat(item[yAxis]))
    ).slice(0, 50);

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: filteredData.map(item => item[xAxis]),
            datasets: [{
                label: yAxisLabel,
                data: filteredData.map(item => parseFloat(item[yAxis])),
                borderColor: '#3498db',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            return `${yAxisLabel}: ${formatNumber(value)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: yAxisLabel
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: xAxis === 'release_year' ? 'Año' : xAxis
                    }
                }
            }
        }
    });
}

// Función para crear o actualizar el gráfico de comparación
function updateComparisonChart(data, category) {
    const ctx = document.getElementById('comparisonChart');
    
    if (comparisonChart) {
        comparisonChart.destroy();
    }

    let yearColumn = 'release_year';
    if (data.length > 0 && data[0].hasOwnProperty('Year')) {
        yearColumn = 'Year';
    }

    const yearlyData = data.reduce((acc, item) => {
        const year = item[yearColumn];
        if (year && !isNaN(parseFloat(year))) {
            if (!acc[year]) {
                acc[year] = [];
            }
            acc[year].push(item);
        }
        return acc;
    }, {});

    const years = Object.keys(yearlyData).sort();
    const counts = years.map(year => yearlyData[year].length);

    let title = '';
    if (category === 'type') {
        title = 'Comparación Anual de Títulos';
    } else if (category === 'Year') {
        title = 'Comparación Anual de Casos';
    } else if (category === 'gender') {
        title = 'Comparación Anual de Estudiantes';
    } else {
        title = 'Comparación Anual';
    }

    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [{
                label: 'Cantidad por Año',
                data: counts,
                backgroundColor: '#e74c3c'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Cantidad: ${formatNumber(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cantidad'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Año'
                    }
                }
            }
        }
    });
}

// Función para actualizar estadísticas
function updateStatistics(data, numericColumn) {
    const values = data.map(item => parseFloat(item[numericColumn])).filter(val => !isNaN(val));
    
    if (values.length === 0) {
        const statsContainer = document.getElementById('statistics');
        statsContainer.innerHTML = `
            <div>
                <strong>Promedio</strong>
                <p>N/A</p>
                <small>No hay datos disponibles</small>
            </div>
            <div>
                <strong>Máximo</strong>
                <p>N/A</p>
                <small>No hay datos disponibles</small>
            </div>
            <div>
                <strong>Mínimo</strong>
                <p>N/A</p>
                <small>No hay datos disponibles</small>
            </div>
            <div>
                <strong>Mediana</strong>
                <p>N/A</p>
                <small>No hay datos disponibles</small>
            </div>
        `;
        return;
    }

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    const sortedValues = [...values].sort((a, b) => a - b);
    let median;
    const midPoint = Math.floor(values.length / 2);
    
    if (values.length % 2 === 0) {
        median = (sortedValues[midPoint - 1] + sortedValues[midPoint]) / 2;
    } else {
        median = sortedValues[midPoint];
    }

    let descriptions = {};
    if (numericColumn === 'release_year') {
        descriptions = {
            avg: 'Año promedio de lanzamiento',
            max: 'Año más reciente',
            min: 'Año más antiguo',
            median: 'Año central'
        };
    } else if (numericColumn === 'Population') {
        descriptions = {
            avg: 'Población promedio afectada',
            max: 'Población máxima afectada',
            min: 'Población mínima afectada',
            median: 'Población central'
        };
    } else if (numericColumn === 'math score') {
        descriptions = {
            avg: 'Puntuación promedio en matemáticas',
            max: 'Puntuación máxima en matemáticas',
            min: 'Puntuación mínima en matemáticas',
            median: 'Puntuación central en matemáticas'
        };
    } else {
        descriptions = {
            avg: 'Valor promedio',
            max: 'Valor máximo',
            min: 'Valor mínimo',
            median: 'Valor central'
        };
    }

    const statsContainer = document.getElementById('statistics');
    statsContainer.innerHTML = `
        <div>
            <strong>Promedio</strong>
            <p>${formatNumber(avg.toFixed(2))}</p>
            <small>${descriptions.avg}</small>
        </div>
        <div>
            <strong>Máximo</strong>
            <p>${formatNumber(max.toFixed(2))}</p>
            <small>${descriptions.max}</small>
        </div>
        <div>
            <strong>Mínimo</strong>
            <p>${formatNumber(min.toFixed(2))}</p>
            <small>${descriptions.min}</small>
        </div>
        <div>
            <strong>Mediana</strong>
            <p>${formatNumber(median.toFixed(2))}</p>
            <small>${descriptions.median}</small>
        </div>
    `;
}

// Función para actualizar la tabla de datos
function updateDataTable(data) {
    currentData = data;
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const headerRow = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');
    const sortSelect = document.getElementById('sortColumn');

    // Traducir nombres de columnas
    const headerTranslations = {
        'type': 'Tipo',
        'title': 'Título',
        'director': 'Director',
        'cast': 'Reparto',
        'country': 'País',
        'date_added': 'Fecha Agregado',
        'release_year': 'Año de Lanzamiento',
        'rating': 'Clasificación',
        'duration': 'Duración',
        'listed_in': 'Categorías',
        'description': 'Descripción',
        'Year': 'Año',
        'Population': 'Población',
        'Cases': 'Casos',
        'gender': 'Género',
        'race/ethnicity': 'Raza/Etnia',
        'parental level of education': 'Nivel Educativo Parental',
        'lunch': 'Almuerzo',
        'test preparation course': 'Curso de Preparación',
        'math score': 'Puntuación Matemáticas',
        'reading score': 'Puntuación Lectura',
        'writing score': 'Puntuación Escritura'
    };

    // Actualizar opciones de ordenamiento
    sortSelect.innerHTML = '<option value="">Ordenar por...</option>' +
        headers.map(header => `<option value="${header}">${headerTranslations[header] || header}</option>`).join('');

    // Actualizar encabezados
    headerRow.innerHTML = headers.map(header => `<th>${headerTranslations[header] || header}</th>`).join('') + '<th>Acciones</th>';

    // Actualizar cuerpo de la tabla
    updateTablePage();
}

// Función para actualizar la página actual de la tabla
function updateTablePage() {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = currentData.slice(start, end);
    
    if (currentData.length === 0) return;
    
    const headers = Object.keys(currentData[0]);
    const tableBody = document.getElementById('tableBody');
    
    tableBody.innerHTML = pageData.map((row, index) => `
        <tr>
            ${headers.map(header => {
                const value = row[header];
                return `<td>${value !== null && value !== undefined && value !== '' ? value : 'N/A'}</td>`;
            }).join('')}
            <td>
                <button class="btn-edit" onclick="editRow(${start + index})">Editar</button>
                <button class="btn-delete" onclick="deleteRow(${start + index})">Eliminar</button>
            </td>
        </tr>
    `).join('');

    // Actualizar información de paginación
    const totalPages = Math.ceil(currentData.length / rowsPerPage);
    document.getElementById('pageInfo').textContent = `Página ${currentPage} de ${totalPages}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

// Funciones CRUD
function addNewRow() {
    if (originalData.length === 0) return;
    
    const headers = Object.keys(originalData[0]);
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Agregar Nuevo Registro</h3>
            <form id="addForm">
                ${headers.map(header => `
                    <div class="form-group">
                        <label for="${header}">${header}:</label>
                        <input type="text" id="${header}" name="${header}" required>
                    </div>
                `).join('')}
                <div class="form-actions">
                    <button type="submit">Guardar</button>
                    <button type="button" onclick="closeModal()">Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('addForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newRow = {};
        headers.forEach(header => {
            newRow[header] = formData.get(header);
        });
        
        originalData.push(newRow);
        currentData.push(newRow);
        updateTablePage();
        closeModal();
        updateDashboardData();
    });
}

function editRow(index) {
    const row = currentData[index];
    const headers = Object.keys(row);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Editar Registro</h3>
            <form id="editForm">
                ${headers.map(header => `
                    <div class="form-group">
                        <label for="${header}">${header}:</label>
                        <input type="text" id="${header}" name="${header}" value="${row[header] || ''}" required>
                    </div>
                `).join('')}
                <div class="form-actions">
                    <button type="submit">Guardar</button>
                    <button type="button" onclick="closeModal()">Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('editForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        headers.forEach(header => {
            row[header] = formData.get(header);
        });
        
        updateTablePage();
        closeModal();
        updateDashboardData();
    });
}

function deleteRow(index) {
    if (confirm('¿Estás seguro de que quieres eliminar este registro?')) {
        const rowToDelete = currentData[index];
        const originalIndex = originalData.findIndex(row => 
            Object.keys(row).every(key => row[key] === rowToDelete[key])
        );
        
        if (originalIndex !== -1) {
            originalData.splice(originalIndex, 1);
        }
        currentData.splice(index, 1);
        
        // Ajustar página si es necesario
        const totalPages = Math.ceil(currentData.length / rowsPerPage);
        if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
        }
        
        updateTablePage();
        updateDashboardData();
    }
}

function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

// Función para actualizar todos los datos del dashboard
function updateDashboardData() {
    const datasetSelect = document.getElementById('datasetSelect');
    const selectedDataset = datasetSelect.value;
    
    if (selectedDataset === 'netflix') {
        updateTotalRecords(currentData);
        updateDistributionChart(currentData, 'tipo', currentData.map(item => item.type));
        updateTrendChart(currentData, 'release_year', 'duration');
        updateStatistics(currentData, 'release_year');
        updateAverageMetric(currentData, 'release_year');
        updateComparisonChart(currentData, 'type');
    } else if (selectedDataset === 'addiction') {
        updateTotalRecords(currentData);
        updateDistributionChart(currentData, 'Año', currentData.map(item => item.Year));
        updateTrendChart(currentData, 'Year', 'Population');
        updateStatistics(currentData, 'Population');
        updateAverageMetric(currentData, 'Population');
        updateComparisonChart(currentData, 'Year');
    } else if (selectedDataset === 'students') {
        updateTotalRecords(currentData);
        updateDistributionChart(currentData, 'gender', currentData.map(item => item.gender));
        updateTrendChart(currentData, 'math score', 'reading score');
        updateStatistics(currentData, 'math score');
        updateAverageMetric(currentData, 'math score');
        updateComparisonChart(currentData, 'gender');
    }
}

// Función para inicializar el dashboard
async function initializeDashboard() {
    const datasetSelect = document.getElementById('datasetSelect');
    const searchInput = document.getElementById('searchInput');
    const sortColumn = document.getElementById('sortColumn');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    
    // Agregar opción de estudiantes al selector
    const studentsOption = document.createElement('option');
    studentsOption.value = 'students';
    studentsOption.textContent = 'Rendimiento de Estudiantes';
    datasetSelect.appendChild(studentsOption);
    
    // Agregar botón para agregar nuevos registros
    const addButton = document.createElement('button');
    addButton.textContent = 'Agregar Registro';
    addButton.className = 'btn-add';
    addButton.onclick = addNewRow;
    document.querySelector('.table-controls').appendChild(addButton);
    
    async function updateDashboard() {
        const selectedDataset = datasetSelect.value;
        let filename = '';
        
        if (selectedDataset === 'netflix') {
            filename = 'netflix_titles.csv';
        } else if (selectedDataset === 'addiction') {
            filename = 'addiction_population_data.csv';
        } else if (selectedDataset === 'students') {
            filename = 'student_performance.csv';
        }
        
        const data = await loadData(filename);
        originalData = [...data];
        currentData = [...data];
        currentPage = 1;
        
        if (data.length > 0) {
            updateTotalRecords(data);
            
            if (selectedDataset === 'netflix') {
                updateDistributionChart(data, 'tipo', data.map(item => item.type));
                updateTrendChart(data, 'release_year', 'duration');
                updateStatistics(data, 'release_year');
                updateAverageMetric(data, 'release_year');
                updateComparisonChart(data, 'type');
            } else if (selectedDataset === 'addiction') {
                updateDistributionChart(data, 'Año', data.map(item => item.Year));
                updateTrendChart(data, 'Year', 'Population');
                updateStatistics(data, 'Population');
                updateAverageMetric(data, 'Population');
                updateComparisonChart(data, 'Year');
            } else if (selectedDataset === 'students') {
                updateDistributionChart(data, 'gender', data.map(item => item.gender));
                updateTrendChart(data, 'math score', 'reading score');
                updateStatistics(data, 'math score');
                updateAverageMetric(data, 'math score');
                updateComparisonChart(data, 'gender');
            }
            
            updateDataTable(data);
        }
    }

    // Event Listeners
    datasetSelect.addEventListener('change', updateDashboard);
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = originalData.filter(row => 
            Object.values(row).some(value => 
                value && value.toString().toLowerCase().includes(searchTerm)
            )
        );
        currentData = filteredData;
        currentPage = 1;
        updateTablePage();
    });

    sortColumn.addEventListener('change', (e) => {
        const column = e.target.value;
        if (column) {
            currentData.sort((a, b) => {
                const valA = a[column];
                const valB = b[column];
                
                // Handle numeric sorting
                const numA = parseFloat(valA);
                const numB = parseFloat(valB);
                if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                }
                
                // Handle string sorting
                return valA < valB ? -1 : valA > valB ? 1 : 0;
            });
            updateTablePage();
        }
    });

    prevPage.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateTablePage();
        }
    });

    nextPage.addEventListener('click', () => {
        const totalPages = Math.ceil(currentData.length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            updateTablePage();
        }
    });

    // Hacer funciones globales para los botones
    window.editRow = editRow;
    window.deleteRow = deleteRow;
    window.closeModal = closeModal;

    await updateDashboard();
}

// Inicializar el dashboard cuando la página carga
document.addEventListener('DOMContentLoaded', initializeDashboard);