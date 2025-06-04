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

// Función para formatear números grandes
function formatNumber(number) {
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
    const description = column === 'release_year' ? 
        'Año promedio de lanzamiento' : 
        'Promedio de población afectada';
    
    document.getElementById('averageMetric').innerHTML = `
        <div class="metric-value">${average.toFixed(2)}</div>
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

    const title = label === 'tipo' ? 'Distribución por Tipo de Contenido' : 'Distribución por Año';

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

    const title = yAxis === 'duration' ? 
        'Tendencia de Duración por Año' : 
        'Tendencia de Población Afectada por Año';

    const yAxisLabel = yAxis === 'duration' ? 'Duración (minutos)' : 'Población';

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => item[xAxis]).slice(0, 50),
            datasets: [{
                label: yAxisLabel,
                data: data.map(item => parseFloat(item[yAxis])).slice(0, 50),
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
                        text: 'Año'
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

    const title = category === 'type' ? 
        'Comparación Anual de Títulos' : 
        'Comparación Anual de Casos';

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
    
    // Check if we have any valid values
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
    
    // Calculate median properly handling both odd and even lengths
    const sortedValues = values.sort((a, b) => a - b);
    let median;
    const midPoint = Math.floor(values.length / 2);
    
    if (values.length % 2 === 0) {
        // Even length - average of two middle values
        median = (sortedValues[midPoint - 1] + sortedValues[midPoint]) / 2;
    } else {
        // Odd length - middle value
        median = sortedValues[midPoint];
    }

    const descriptions = numericColumn === 'release_year' ? {
        avg: 'Año promedio de lanzamiento',
        max: 'Año más reciente',
        min: 'Año más antiguo',
        median: 'Año central'
    } : {
        avg: 'Población promedio afectada',
        max: 'Población máxima afectada',
        min: 'Población mínima afectada',
        median: 'Población central'
    };

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
        'Cases': 'Casos'
    };

    // Actualizar opciones de ordenamiento
    sortSelect.innerHTML = '<option value="">Ordenar por...</option>' +
        headers.map(header => `<option value="${header}">${headerTranslations[header] || header}</option>`).join('');

    // Actualizar encabezados
    headerRow.innerHTML = headers.map(header => `<th>${headerTranslations[header] || header}</th>`).join('');

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
            ${headers.map(header => {
                const value = row[header];
                return `<td>${value !== null && value !== undefined ? value : 'N/A'}</td>`;
            }).join('')}
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
                value && value.toString().toLowerCase().includes(searchTerm)
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