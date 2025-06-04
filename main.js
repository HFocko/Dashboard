import Papa from 'papaparse';
import Chart from 'chart.js/auto';

let distributionChart = null;
let trendChart = null;
let comparisonChart = null;
let currentPage = 1;
const rowsPerPage = 10;
let currentData = [];

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

// Función para actualizar el total de registros
function updateTotalRecords(data) {
    document.getElementById('totalRecords').textContent = data.length;
}

// Función para actualizar el promedio general
function updateAverageMetric(data, column) {
    const values = data.map(item => parseFloat(item[column])).filter(val => !isNaN(val));
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    document.getElementById('averageMetric').textContent = average.toFixed(2);
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
                    '#e74c3c'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `Distribución por ${label}`
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

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => item[xAxis]).slice(0, 50),
            datasets: [{
                label: yAxis,
                data: data.map(item => item[yAxis]).slice(0, 50),
                borderColor: '#3498db',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `${yAxis} a lo largo de ${xAxis}`
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

    const yearlyData = data.reduce((acc, item) => {
        const year = item.release_year || item.Year;
        if (!acc[year]) {
            acc[year] = [];
        }
        acc[year].push(item);
        return acc;
    }, {});

    const years = Object.keys(yearlyData).sort();
    const counts = years.map(year => yearlyData[year].length);

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
                    text: 'Comparación Anual'
                }
            }
        }
    });
}

// Función para actualizar estadísticas
function updateStatistics(data, numericColumn) {
    const values = data.map(item => parseFloat(item[numericColumn])).filter(val => !isNaN(val));
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const median = values.sort((a, b) => a - b)[Math.floor(values.length / 2)];

    const statsContainer = document.getElementById('statistics');
    statsContainer.innerHTML = `
        <div>
            <strong>Promedio</strong>
            <p>${avg.toFixed(2)}</p>
        </div>
        <div>
            <strong>Máximo</strong>
            <p>${max.toFixed(2)}</p>
        </div>
        <div>
            <strong>Mínimo</strong>
            <p>${min.toFixed(2)}</p>
        </div>
        <div>
            <strong>Mediana</strong>
            <p>${median.toFixed(2)}</p>
        </div>
    `;
}

// Función para actualizar la tabla de datos
function updateDataTable(data) {
    currentData = data;
    const headers = Object.keys(data[0]);
    const headerRow = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');
    const sortSelect = document.getElementById('sortColumn');

    // Actualizar opciones de ordenamiento
    sortSelect.innerHTML = '<option value="">Ordenar por...</option>' +
        headers.map(header => `<option value="${header}">${header}</option>`).join('');

    // Actualizar encabezados
    headerRow.innerHTML = headers.map(header => `<th>${header}</th>`).join('');

    // Actualizar cuerpo de la tabla
    updateTablePage();
}

// Función para actualizar la página actual de la tabla
function updateTablePage() {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = currentData.slice(start, end);
    const headers = Object.keys(currentData[0]);

    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = pageData.map(row => `
        <tr>
            ${headers.map(header => `<td>${row[header]}</td>`).join('')}
        </tr>
    `).join('');

    // Actualizar información de paginación
    const totalPages = Math.ceil(currentData.length / rowsPerPage);
    document.getElementById('pageInfo').textContent = `Página ${currentPage} de ${totalPages}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

// Función para inicializar el dashboard
async function initializeDashboard() {
    const datasetSelect = document.getElementById('datasetSelect');
    const searchInput = document.getElementById('searchInput');
    const sortColumn = document.getElementById('sortColumn');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    
    async function updateDashboard() {
        const selectedDataset = datasetSelect.value;
        const filename = selectedDataset === 'netflix' ? 'netflix_titles.csv' : 'addiction_population_data.csv';
        
        const data = await loadData(filename);
        
        if (data.length > 0) {
            updateTotalRecords(data);
            
            if (selectedDataset === 'netflix') {
                updateDistributionChart(data, 'tipo', data.map(item => item.type));
                updateTrendChart(data, 'release_year', 'duration');
                updateStatistics(data, 'release_year');
                updateAverageMetric(data, 'release_year');
                updateComparisonChart(data, 'type');
            } else {
                updateDistributionChart(data, 'Año', data.map(item => item.Year));
                updateTrendChart(data, 'Year', 'Population');
                updateStatistics(data, 'Population');
                updateAverageMetric(data, 'Population');
                updateComparisonChart(data, 'Year');
            }
            
            updateDataTable(data);
        }
    }

    // Event Listeners
    datasetSelect.addEventListener('change', updateDashboard);
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = currentData.filter(row => 
            Object.values(row).some(value => 
                value.toString().toLowerCase().includes(searchTerm)
            )
        );
        currentPage = 1;
        updateDataTable(filteredData);
    });

    sortColumn.addEventListener('change', (e) => {
        const column = e.target.value;
        if (column) {
            currentData.sort((a, b) => {
                const valA = a[column];
                const valB = b[column];
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

    await updateDashboard();
}

// Inicializar el dashboard cuando la página carga
document.addEventListener('DOMContentLoaded', initializeDashboard);