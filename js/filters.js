/**
 * FILTERS - Gestión de filtros globales y búsqueda
 */

class FilterManager {
    constructor() {
        this.currentFilters = {
            proceso: '',
            auditoria: '',
            estado: ''
        };
        
        this.searchKeyword = '';
        this.storageKey = 'dashboard_filters';
    }

    /**
     * Inicializar filtros
     */
    initFilters() {
        this.attachEventListeners();
        this.loadFilteredData();
        this.populateFilterOptions();
        this.applyFilters();
        console.log('✓ Filtros inicializados');
    }

    /**
     * Adjuntar event listeners
     */
    attachEventListeners() {
        // Filtros
        document.getElementById('filterProceso').addEventListener('change', (e) => {
            this.currentFilters.proceso = e.target.value;
            this.applyFilters();
        });

        document.getElementById('filterAuditoria').addEventListener('change', (e) => {
            this.currentFilters.auditoria = e.target.value;
            this.applyFilters();
        });

        document.getElementById('filterEstado').addEventListener('change', (e) => {
            this.currentFilters.estado = e.target.value;
            this.applyFilters();
        });

        // Búsqueda global
        document.getElementById('searchGlobal').addEventListener('input', (e) => {
            this.searchKeyword = e.target.value;
            this.applyFilters();
        });

        // Botón limpiar filtros
        document.getElementById('btnLimpiarFiltros').addEventListener('click', () => {
            this.clearFilters();
        });
    }

    /**
     * Llenar opciones de filtros
     */
    populateFilterOptions() {
        // Procesos
        const procesos = dataManager.getUniqueProcesos();
        const selectProceso = document.getElementById('filterProceso');
        procesos.forEach(proceso => {
            const option = document.createElement('option');
            option.value = proceso;
            option.textContent = proceso;
            selectProceso.appendChild(option);
        });

        // Auditorías
        const auditorias = dataManager.getAuditorias();
        const selectAuditoria = document.getElementById('filterAuditoria');
        auditorias.forEach(auditoria => {
            const option = document.createElement('option');
            option.value = auditoria;
            option.textContent = auditoria;
            selectAuditoria.appendChild(option);
        });
    }

    /**
     * Aplicar filtros
     */
    applyFilters() {
        let filteredData = dataManager.filterData(this.currentFilters);

        if (this.searchKeyword) {
            filteredData = dataManager.globalSearch(this.searchKeyword, filteredData);
        }

        // Guardar en localStorage
        this.saveFilters();

        // Actualizar dashboard
        dashboard.updateDashboard(filteredData);

        console.log(`✓ Filtros aplicados: ${filteredData.length} registros`);
    }

    /**
     * Limpiar filtros
     */
    clearFilters() {
        this.currentFilters = {
            proceso: '',
            auditoria: '',
            estado: ''
        };

        this.searchKeyword = '';

        // Resetear UI
        document.getElementById('filterProceso').value = '';
        document.getElementById('filterAuditoria').value = '';
        document.getElementById('filterEstado').value = '';
        document.getElementById('searchGlobal').value = '';

        this.applyFilters();
    }

    /**
     * Guardar filtros en localStorage
     */
    saveFilters() {
        const filters = {
            ...this.currentFilters,
            search: this.searchKeyword,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(this.storageKey, JSON.stringify(filters));
    }

    /**
     * Cargar filtros desde localStorage
     */
    loadFilteredData() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                const filters = JSON.parse(stored);
                // Restaurar filtros (solo si no fueron resetados)
                if (filters.proceso) this.currentFilters.proceso = filters.proceso;
                if (filters.auditoria) this.currentFilters.auditoria = filters.auditoria;
                if (filters.estado) this.currentFilters.estado = filters.estado;
                if (filters.search) this.searchKeyword = filters.search;

                // Restaurar en UI
                if (filters.proceso) document.getElementById('filterProceso').value = filters.proceso;
                if (filters.auditoria) document.getElementById('filterAuditoria').value = filters.auditoria;
                if (filters.estado) document.getElementById('filterEstado').value = filters.estado;
                if (filters.search) document.getElementById('searchGlobal').value = filters.search;

                console.log('✓ Filtros restaurados desde localStorage');
            } catch (error) {
                console.warn('⚠ Error al restaurar filtros:', error);
            }
        }
    }

    /**
     * Obtener filtros actuales
     */
    getCurrentFilters() {
        return { ...this.currentFilters };
    }

    /**
     * Obtener búsqueda actual
     */
    getSearchKeyword() {
        return this.searchKeyword;
    }

    /**
     * Establecer filtro programáticamente
     */
    setFilter(filterName, value) {
        if (this.currentFilters.hasOwnProperty(filterName)) {
            this.currentFilters[filterName] = value;
            
            // Actualizar UI
            const selectId = `filter${filterName.charAt(0).toUpperCase() + filterName.slice(1)}`;
            const select = document.getElementById(selectId);
            if (select) {
                select.value = value;
            }
            
            this.applyFilters();
        }
    }
}

// Exportar instancia global
const filterManager = new FilterManager();
