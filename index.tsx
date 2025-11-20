// ============================================
// SISTEMA DE ALMACENAMIENTO PERSISTENTE
// ============================================

// FIX: Added interfaces for strong typing of complex objects.
interface Draw {
  id: number;
  date: Date;
  numbers: number[];
  sum: number;
}

interface Ticket {
  date: string; // Creation date
  combinations: number[][];
  strategy: string;
  drawDate?: string; // Optional draw date for the ticket
  validation?: { // Optional validation results
    winningNumbers: number[];
    hits: number[];
  };
}

interface Filters {
  terminaciones: number[];
  terminacionesDistintas: number[];
  sum: { min: number; max: number };
  parImpar: string[];
  bajosAltos: string[];
  primos: { min: number; max: number };
  consecutivos: string[];
  distancia: { min: number; max: number };
  agrupDecenas: string[];
  sumaDigitos: { min: number; max: number };
  desviacion: { min: number; max: number };
  entropy: { min: number; max: number };
  geometric: { exclude: string[]; favor: string[] };
  useMarkov: boolean;
  useNash: boolean;
  useRegression: boolean;
  ai: {
    markovDepth: number;
    nashWeight: number;
    regressionBonus: number;
  }
}

interface TutorialStep {
    targetElement: string;
    title: string;
    text: string;
}

// Clase principal de la aplicación
class DataLotto49Advanced {
  // Coordenadas pre-calculadas para cada número en la cuadrícula 7x7
  static NUMBER_COORDS = (() => {
      const coords: { [key: number]: { row: number; col: number } } = {};
      for (let i = 1; i <= 49; i++) {
          coords[i] = { row: Math.floor((i - 1) / 7), col: (i - 1) % 7 };
      }
      return coords;
  })();
  
  static APP_STATE_KEY = 'dataLotto49State';
  static TUTORIAL_KEY = 'dataLotto49TutorialSeen';


    // FIX: Declared all class properties with their correct types to resolve property-does-not-exist errors.
    selectedNumbers: Set<number>;
    excludedNumbers: Set<number>;
    hotNumbers: Set<number>;
    coldNumbers: Set<number>;
    absentNumbers: Set<number>;
    currentSelectionMode: 'excluded' | 'hot' | 'cold' | 'figure' | 'absent' | null;
    isGenerating: boolean;
    savedTickets: Ticket[];
    currentTicket: Ticket | null;
    currentValidatingTicket: Ticket | null;
    historicalData: Draw[];
    numberStats: { [key: number]: { frequency: number; score: number; lastSeen: number; } };
    analysisPeriod: number;
    dataLoaded: boolean;
    dataType: string;
    filters: Filters;
    primes: Set<number>;
    TOLERANCE_LEVELS: { [key: number]: number };
    tutorialSteps: TutorialStep[];
    currentTutorialStep: number;


  constructor() {
    // Estado del sistema
    this.selectedNumbers = new Set();
    this.excludedNumbers = new Set();
    this.hotNumbers = new Set();
    this.coldNumbers = new Set();
    this.absentNumbers = new Set();
    this.currentSelectionMode = null; // null | 'excluded' | 'hot' | 'cold' | 'figure' | 'absent'
    this.isGenerating = false;
    this.savedTickets = [];
    this.currentTicket = null;
    this.currentValidatingTicket = null;
    this.historicalData = [];
    this.numberStats = {};
    this.analysisPeriod = 100;
    this.dataLoaded = false;
    this.dataType = 'none';
    this.currentTutorialStep = 0;

    // Filtros (activados todos los niveles)
    this.filters = {
      terminaciones: [],
      terminacionesDistintas: [4, 5, 6],
      sum: { min: 121, max: 190 },
      parImpar: [],
      bajosAltos: [],
      primos: { min: 1, max: 3 },
      consecutivos: [],
      distancia: { min: 1, max: 25 },
      agrupDecenas: [],
      sumaDigitos: { min: 28, max: 45 },
      desviacion: { min: 12.0, max: 18.0 },
      entropy: { min: 2.3, max: 2.6 },
      geometric: { exclude: [], favor: [] },
      useMarkov: false,
      useNash: false,
      useRegression: false,
      ai: {
        markovDepth: 5,
        nashWeight: 1,
        regressionBonus: 3
      }
    };
    
    // Constantes y pre-cálculos
    this.primes = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]);
    this.TOLERANCE_LEVELS = { // Niveles de tolerancia para la estrategia Múltiple
        7: 0.70,
        8: 0.50,
        9: 0.35,
        10: 0.25,
        11: 0.20
    };
    
    this.tutorialSteps = [
        { targetElement: '.data-analysis-section', title: '1/6: Carga de Datos', text: 'Empieza cargando datos históricos. Usa los botones 📊 para cargar un archivo, 🔗 desde una URL, o 🎰 para simular datos. Esto es crucial para el análisis y las estrategias de IA.' },
        { targetElement: '.number-selection-section', title: '2/6: Selección de Números', text: 'Aquí puedes seleccionar tus números. Usa los botones de modo (❄️🔥👻🚫🗺️) para marcar números fríos, calientes, ausentes, excluidos o dibujar una figura como base para la generación.' },
        { targetElement: '.strategy-section', title: '3/6: Estrategia de Juego', text: 'Selecciona tu estrategia. Simple (azar puro), Ganadora (fuerza bruta con filtros) o Múltiple (superconjuntos).' },
        { targetElement: '#filtersContent', title: '4/6: Filtros Avanzados', text: 'Este es el corazón de la app. Activa y ajusta los filtros para refinar la búsqueda de combinaciones. Cada filtro se basa en patrones estadísticos de sorteos reales.' },
        { targetElement: '[title*="Filtros Predictivos"]', title: '5/6: Filtros Predictivos (IA)', text: 'Activa y configura los modelos de IA para aplicar una capa extra de inteligencia a tu selección, favoreciendo números basados en secuencias, popularidad o regresión a la media.' },
        { targetElement: '.saved-tickets-section', title: '6/6: Guarda y Analiza', text: 'Una vez generado un boleto, guárdalo aquí. Si cargas datos reales de sorteos pasados, tus boletos se validarán automáticamente para que puedas analizar tus resultados.' }
    ];

    this.init();
  }

  init() {
    this.createNumbersGrid();
    this.loadState();
    this.updateUIFromFilterState();
    this.initializeHistoricalData();
    this.analyzeNumbers();
    this.updateGridNumberStates();
    this.bindEvents();
    this.updateSavedTickets();
    this.updateDataAnalysis();
  }

  // ===== PERSISTENCIA DE DATOS =====
  saveState() {
      try {
          const state = {
              savedTickets: this.savedTickets,
              filters: this.filters,
              historicalData: this.historicalData,
              dataType: this.dataType,
              dataLoaded: this.dataLoaded,
          };
          localStorage.setItem(DataLotto49Advanced.APP_STATE_KEY, JSON.stringify(state));
      } catch (error) {
          console.error("Error guardando el estado:", error);
          this.showToast('Error al guardar el estado de la app', 'error');
      }
  }

  loadState() {
      try {
          const savedStateJSON = localStorage.getItem(DataLotto49Advanced.APP_STATE_KEY);
          if (savedStateJSON) {
              const savedState = JSON.parse(savedStateJSON);
              this.savedTickets = savedState.savedTickets || [];
              this.filters = { ...this.filters, ...(savedState.filters || {}) }; // Merge to keep new defaults
              if (!this.filters.ai) { // Ensure ai config exists for older states
                this.filters.ai = { markovDepth: 5, nashWeight: 1, regressionBonus: 3 };
              }
              this.historicalData = (savedState.historicalData || []).map((d: any) => ({...d, date: new Date(d.date)}));
              this.dataType = savedState.dataType || 'none';
              this.dataLoaded = savedState.dataLoaded || false;
              console.log("Estado de la aplicación cargado desde localStorage.");
          }
      } catch (error) {
          console.error("Error cargando el estado:", error);
          this.showToast('No se pudo cargar el estado anterior', 'warning');
      }
  }

  updateUIFromFilterState() {
    // Inputs de rango
    const setVal = (id: string, value: number | string) => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (el) el.value = String(value);
    };
    
    const setRangeVal = (id: string, value: number) => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (el) el.value = String(value);
      const displayEl = document.getElementById(`${id}Value`);
      if (displayEl) displayEl.textContent = String(value);
    }

    setVal('sumMin', this.filters.sum.min);
    setVal('sumMax', this.filters.sum.max);
    setVal('primosMin', this.filters.primos.min);
    setVal('primosMax', this.filters.primos.max);
    setVal('distanciaMin', this.filters.distancia.min);
    setVal('distanciaMax', this.filters.distancia.max);
    setVal('sumaDigitosMin', this.filters.sumaDigitos.min);
    setVal('sumaDigitosMax', this.filters.sumaDigitos.max);
    setVal('desviacionMin', this.filters.desviacion.min);
    setVal('desviacionMax', this.filters.desviacion.max);
    setVal('entropyMin', this.filters.entropy.min);
    setVal('entropyMax', this.filters.entropy.max);
    
    setRangeVal('markovDepth', this.filters.ai.markovDepth);
    setRangeVal('nashWeight', this.filters.ai.nashWeight);
    setRangeVal('regressionBonus', this.filters.ai.regressionBonus);


    // Chips
    const updateChips = (selector: string, activeValues: (string | number)[]) => {
      document.querySelectorAll(selector).forEach(chip => {
        const chipEl = chip as HTMLElement;
        const value = chipEl.dataset.value!;
        if (activeValues.map(String).includes(value)) {
          chipEl.classList.add('active');
        } else {
          chipEl.classList.remove('active');
        }
      });
    };

    updateChips('#terminacionesOptions .filter-chip', this.filters.terminaciones);
    updateChips('#terminacionesDistintasOptions .filter-chip', this.filters.terminacionesDistintas);
    updateChips('#parImparOptions .filter-chip', this.filters.parImpar);
    updateChips('#bajosAltosOptions .filter-chip', this.filters.bajosAltos);
    updateChips('#consecutivosOptions .filter-chip', this.filters.consecutivos);
    updateChips('#agrupDecenasOptions .filter-chip', this.filters.agrupDecenas);
    
    // Chips geométricos (caso especial)
    document.querySelectorAll('#geometricOptions .filter-chip').forEach(chip => {
        const chipEl = chip as HTMLElement;
        const value = chipEl.dataset.value!;
        chipEl.classList.remove('active');
        if (this.filters.geometric.exclude.includes(value) || this.filters.geometric.favor.includes(value)) {
            chipEl.classList.add('active');
        }
    });

    // Switches
    const setChecked = (id: string, isChecked: boolean) => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (el) el.checked = isChecked;
    };
    
    setChecked('useMarkovSwitch', this.filters.useMarkov);
    setChecked('useNashSwitch', this.filters.useNash);
    setChecked('useRegressionSwitch', this.filters.useRegression);
  }

  // ===== DATOS HISTÓRICOS (Sin cambios) =====
  initializeHistoricalData() {
    if (!this.dataLoaded) {
      this.simulateHistoricalData(500);
    }
  }
  simulateHistoricalData(numDraws = 500) {
    this.showFilterSpinner();
    this.historicalData = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - numDraws * 3.5);

    for(let i = 0; i < numDraws; i++) {
      const drawDate = new Date(baseDate);
      drawDate.setDate(drawDate.getDate() + (i * 3.5));
      const numbers = this.generateRealisticDraw();
      this.historicalData.push({
        id: i + 1,
        date: drawDate,
        numbers: numbers.sort((a, b) => a - b),
        sum: numbers.reduce((a, b) => a + b, 0)
      });
    }
    
    this.dataType = 'simulated';
    this.dataLoaded = true;
    this.updateDataAnalysis();
    this.analyzeNumbers();
    this.updateGridNumberStates();
    this.saveState();
    this.showToast('✅ Datos simulados generados correctamente', 'success');
    this.hideFilterSpinner();
  }
  generateRealisticDraw(): number[] {
    const numbers = new Set<number>();
    while(numbers.size < 6) {
        const num = Math.floor(Math.random() * 49) + 1;
        if(!numbers.has(num)) {
            numbers.add(num);
        }
    }
    return Array.from(numbers);
  }
  async loadRealData(files: FileList) {
    this.showFilterSpinner();
    try {
      this.historicalData = [];
      let totalDraws = 0;
      
      for (const file of Array.from(files)) {
        const data = await this.loadDataFile(file);
        this.historicalData.push(...data);
        totalDraws += data.length;
      }
      
      this.historicalData.sort((a, b) => a.date.getTime() - b.date.getTime());
      this.historicalData.forEach((draw, index) => {
        draw.id = index + 1;
      });
      
      this.dataType = 'real';
      this.dataLoaded = true;
      this.updateDataAnalysis();
      this.analyzeNumbers();
      this.updateGridNumberStates();
      this.saveState();
      
      this.showToast(`✅ Datos reales cargados: ${totalDraws} sorteos`, 'success');
      this.autoValidateSavedTickets();
      
    } catch (error: any) {
      this.showToast(`Error cargando datos: ${error.message}`, 'error');
    } finally {
        this.hideFilterSpinner();
    }
  }
  async loadDataFromUrl() {
    const url = prompt("Introduce la URL del archivo de datos (CSV):");
    if (!url) return;
    this.showFilterSpinner();
    try {
      this.showLoading('Cargando datos desde URL...');
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      const content = await response.text();
      const data = this.parseCSVData(content);
      
      this.historicalData = data;
      this.dataType = 'url';
      this.dataLoaded = true;
      this.updateDataAnalysis();
      this.analyzeNumbers();
      this.updateGridNumberStates();
      this.saveState();
      this.showToast(`✅ Datos cargados desde URL: ${data.length} sorteos`, 'success');
      this.autoValidateSavedTickets();
    } catch (error: any) {
      this.showToast(`Error al cargar desde URL: ${error.message}`, 'error');
    } finally {
        this.hideLoading();
        this.hideFilterSpinner();
    }
  }
  async loadDataFile(file: File): Promise<Draw[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target!.result as string;
          resolve(this.parseCSVData(content));
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Error leyendo archivo'));
      reader.readAsText(file);
    });
  }
  parseCSVData(content: string): Draw[] {
    const lines = content.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) {
        return [];
    }

    const firstLine = lines.shift()!;
    const header = firstLine.toLowerCase().split(/[,;\t\s]+/).map(h => h.trim());

    // Heuristic to detect header: check if any cell is a word (not a number and not a date-like string)
    const isHeader = header.some(h => isNaN(parseInt(h)) && isNaN(new Date(h).getTime()));
    
    if (!isHeader) {
        // No header detected, add the first line back to the data.
        lines.unshift(firstLine); 
    }
    
    let dateIndex = -1;
    let numberIndices: number[] = [];

    if (isHeader) {
        const dateKeywords = ['fecha', 'date'];
        dateIndex = header.findIndex(h => dateKeywords.some(k => h.includes(k)));

        const numberHeaderCandidates: {index: number, name: string}[] = [];
        header.forEach((h, i) => {
            // Match things like 'n1', 'bola_2', 'num-3' etc.
            if (/^(n|bola|num|number)[\s_-]*\d+$/.test(h)) {
                numberHeaderCandidates.push({index: i, name: h});
            }
        });
        
        if (numberHeaderCandidates.length >= 6) {
            numberHeaderCandidates.sort((a, b) => {
                const numA = parseInt(a.name.match(/\d+$/)![0]);
                const numB = parseInt(b.name.match(/\d+$/)![0]);
                return numA - numB;
            });
            numberIndices = numberHeaderCandidates.map(c => c.index).slice(0, 6);
        }
    }

    // If header parsing was not definitive or there was no header, use a more general approach
    if (numberIndices.length < 6) {
        return lines.map((line, i) => {
            const parts = line.split(/[,;\t\s]+/);
            let date: Date | null = null;
            
            // Try to find a date in the first column
            if (parts.length > 0) {
                const d = new Date(parts[0]);
                // Very basic date validation (must look like a date)
                if (!isNaN(d.getTime()) && (parts[0].includes('-') || parts[0].includes('/'))) {
                   date = d;
                }
            }

            const numbers = parts.map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 49);
            
            if (numbers.length < 6) {
                console.warn(`Línea ${i + 1} ignorada: no se encontraron 6 números válidos (1-49).`);
                return null;
            }
            
            const finalNumbers = numbers.slice(0, 6);

            return {
                id: i + 1,
                date: date || new Date(Date.now() - (lines.length - i) * 3.5 * 24 * 60 * 60 * 1000),
                numbers: finalNumbers.sort((a, b) => a - b),
                sum: finalNumbers.reduce((a, b) => a + b, 0)
            };
        }).filter(Boolean) as Draw[];
    }
    
    // Header parsing was successful, process lines with specific indices
    return lines.map((line, i) => {
        try {
            const parts = line.split(/[,;\t\s]+/);
            if (parts.length <= Math.max(...numberIndices, dateIndex)) {
                throw new Error("La línea no tiene suficientes columnas.");
            }

            const numbers = numberIndices.map(index => parseInt(parts[index].trim()));
            
            if (numbers.some(isNaN)) throw new Error("Uno de los números no es válido.");
            if (numbers.some(n => n < 1 || n > 49)) throw new Error(`Números fuera de rango (1-49)`);

            let date: Date;
            if (dateIndex > -1 && parts[dateIndex]) {
                const parsedDate = new Date(parts[dateIndex]);
                if (isNaN(parsedDate.getTime())) {
                    throw new Error("Formato de fecha no válido.");
                }
                date = parsedDate;
            } else {
                // Generate fallback date
                date = new Date(Date.now() - (lines.length - i) * 3.5 * 24 * 60 * 60 * 1000);
            }

            return {
                id: i + 1,
                date: date,
                numbers: numbers.sort((a, b) => a - b),
                sum: numbers.reduce((a, b) => a + b, 0)
            };
        } catch (error: any) {
            console.warn(`Error procesando línea ${i + 2}: ${error.message}. Se ignora la línea. Contenido: "${line}"`);
            return null;
        }
    }).filter(Boolean) as Draw[];
  }
  updateDataAnalysis() {
    const dataInfo = document.getElementById('dataInfo');
    const dataStatsGrid = document.getElementById('dataStatsGrid');
    if (!dataInfo || !dataStatsGrid) return;
    
    if (!this.dataLoaded || this.historicalData.length === 0) {
      dataInfo.textContent = 'No hay datos cargados. Carga una base de datos CSV/DB o simula datos históricos.';
      dataInfo.className = 'data-info';
      dataStatsGrid.style.display = 'none';
      this.renderFrequencyChart(); // Clear chart
      return;
    }
    const frequencies: { [key: number]: number } = {};
    for (let i = 1; i <= 49; i++) frequencies[i] = 0;
    this.historicalData.forEach(draw => draw.numbers.forEach(num => frequencies[num]++));
    const sortedFreq = Object.entries(frequencies).sort((a, b) => b[1] - a[1]);
    dataInfo.innerHTML = `📊 ${this.historicalData.length} sorteos cargados (${this.dataType.toUpperCase()})`;
    dataInfo.className = 'data-info has-data';
    
    const safeSetText = (id: string, text: string | number) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(text);
    };
    
    safeSetText('totalDraws', this.historicalData.length);
    safeSetText('dataType', this.dataType.toUpperCase());
    safeSetText('mostFrequent', sortedFreq.slice(0, 3).map(([num]) => num).join(', '));
    safeSetText('leastFrequent', sortedFreq.slice(-3).map(([num]) => num).join(', '));
    
    const chiSquareEl = document.getElementById('chiSquare');
    const biasEl = document.getElementById('biasDetected');

    if (this.historicalData.length >= 50 && chiSquareEl && biasEl) {
        const expectedFrequency = (this.historicalData.length * 6) / 49;
        let chiSquareStat = 0;
        for (let i = 1; i <= 49; i++) {
            chiSquareStat += Math.pow(frequencies[i] - expectedFrequency, 2) / expectedFrequency;
        }
        const criticalValue = 65.17; // df=48, p=0.05
        const biasDetected = chiSquareStat > criticalValue;
        
        chiSquareEl.textContent = chiSquareStat.toFixed(2);
        biasEl.textContent = biasDetected ? 'Sí (Significativo al 95%)' : 'No (Distribución Normal)';
        biasEl.classList.toggle('invalid', biasDetected);
        biasEl.classList.toggle('valid', !biasDetected);
    } else if(chiSquareEl && biasEl) {
        chiSquareEl.textContent = 'N/A';
        biasEl.textContent = 'Datos insuficientes';
        biasEl.classList.remove('valid', 'invalid');
    }
    
    dataStatsGrid.style.display = 'grid';
    this.renderFrequencyChart();
  }

  // ===== ANÁLISIS DE NÚMEROS (Actualizado) =====
  analyzeNumbers() {
    // Reset stats
    for(let i = 1; i <= 49; i++) this.numberStats[i] = { frequency: 0, score: 0, lastSeen: 0 };
    
    // Recorrer toda la historia
    this.historicalData.forEach(draw => {
        // Basic Stats
        draw.numbers.forEach(num => {
            this.numberStats[num].lastSeen = draw.id;
        });
    });
    
    // Recorrer el periodo de análisis para la frecuencia (calientes/fríos)
    const analysisData = this.historicalData.slice(-this.analysisPeriod);
    if (analysisData.length === 0) {
        this.classifyNumbers(); // Limpiará los sets si no hay datos
        return;
    }
    analysisData.forEach(draw => draw.numbers.forEach(num => this.numberStats[num].frequency++));
    
    this.classifyNumbers();
  }
  classifyNumbers() {
    const freqs = Object.values(this.numberStats).map(s => s.frequency);
    const sortedFreqs = [...freqs].sort((a, b) => a - b);
    const hotThreshold = sortedFreqs[Math.floor(sortedFreqs.length * 0.7)];
    const coldThreshold = sortedFreqs[Math.floor(sortedFreqs.length * 0.3)];
    this.hotNumbers.clear();
    this.coldNumbers.clear();
    this.absentNumbers.clear();
    
    for (let num = 1; num <= 49; num++) {
      const freq = this.numberStats[num].frequency;
      if (freq >= hotThreshold) this.hotNumbers.add(num);
      if (freq <= coldThreshold) this.coldNumbers.add(num);
    }
    
    // Calcular números ausentes
    if (this.historicalData.length > 0) {
        const totalDraws = this.historicalData[this.historicalData.length - 1].id;
        const numberAbsences: { num: number; absence: number }[] = [];
        for (let num = 1; num <= 49; num++) {
            const absence = totalDraws - this.numberStats[num].lastSeen;
            numberAbsences.push({ num, absence });
        }
        
        numberAbsences.sort((a, b) => b.absence - a.absence);
        
        // Marcar los 5 más ausentes
        for (let i = 0; i < 5 && i < numberAbsences.length; i++) {
            const num = numberAbsences[i].num;
            if (this.numberStats[num].lastSeen > 0) {
                 this.absentNumbers.add(num);
            }
        }
    }
  }
  updateGridNumberStates() {
    for (let i = 1; i <= 49; i++) {
      const ball = document.querySelector(`.number-ball[data-number="${i}"]`);
      if (ball) {
        ball.classList.remove('hot', 'cold', 'absent');
        const icon = ball.querySelector('.number-icon');
        if (!icon) continue;

        let newIcon = '';
        
        if (this.hotNumbers.has(i)) {
            ball.classList.add('hot');
            newIcon = '🔥';
        } else if (this.absentNumbers.has(i)) {
            ball.classList.add('absent');
            newIcon = '👻';
        } else if (this.coldNumbers.has(i)) {
            ball.classList.add('cold');
            newIcon = '❄️';
        }
        
        const currentIcon = icon.textContent;
        if (['🔥', '❄️', '👻', ''].includes(currentIcon || '')) {
            icon.textContent = newIcon;
        }
      }
    }
  }

  // ===== UI SETUP Y EVENTOS =====
  createNumbersGrid() {
    const grid = document.getElementById('numbersGrid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 1; i <= 49; i++) {
      const ball = document.createElement('div');
      ball.classList.add('number-ball');
      // FIX: dataset values must be strings.
      ball.dataset.number = String(i);
      ball.innerHTML = `${i}<span class="number-icon"></span>`;
      if (this.hotNumbers.has(i)) ball.classList.add('hot');
      if (this.coldNumbers.has(i)) ball.classList.add('cold');
      if (this.absentNumbers.has(i)) ball.classList.add('absent');
      grid.appendChild(ball);
    }
  }
  bindEvents() {
    document.getElementById('numbersGrid')?.addEventListener('click', e => {
      // FIX: Cast e.target to HTMLElement to access classList
      const target = e.target as HTMLElement;
      if (target.classList.contains('number-ball')) this.handleNumberClick(target);
    });
    document.querySelector('.selection-mode-controls')?.addEventListener('click', e => {
        // FIX: Cast e.target to HTMLElement to use closest()
        const btn = (e.target as HTMLElement).closest<HTMLElement>('.selection-mode-btn');
        if (!btn) return;
        const mode = btn.dataset.mode;
        
        if (['cold', 'hot', 'excluded', 'figure', 'absent'].includes(mode || '')) {
            this.updateSelectionMode(mode as 'cold' | 'hot' | 'excluded' | 'figure' | 'absent');
        } else if (btn.id === 'randomBtn') {
            this.randomSelect();
        } else if (btn.id === 'clearBtn') {
            this.clearSelections(true);
            const clearBtn = document.getElementById('clearBtn');
            if (clearBtn) {
              clearBtn.classList.add('shake');
              setTimeout(() => clearBtn.classList.remove('shake'), 500);
            }
        } else if (btn.id === 'dataBtn') {
            document.getElementById('fileInput')?.click();
        } else if (btn.id === 'simulateBtn') {
            this.simulateHistoricalData(500);
        } else if (btn.id === 'urlBtn') {
            this.loadDataFromUrl();
        }
    });
    document.querySelectorAll('.collapsible-header').forEach(h => h.addEventListener('click', () => {
        // FIX: Cast to HTMLElement to access dataset
        this.toggleCollapse((h as HTMLElement).dataset.target!)
    }));
    document.querySelectorAll('.strategy-btn').forEach(btn => btn.addEventListener('click', () => {
        // FIX: Cast to HTMLElement to access dataset
        this.updateStrategyUI((btn as HTMLElement).dataset.strategy!)
    }));
    document.querySelectorAll('.number-option').forEach(opt => opt.addEventListener('click', () => {
      document.querySelectorAll('.number-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
    }));
    document.getElementById('generateBtn')?.addEventListener('click', () => this.generateCombinations());
    document.getElementById('saveBtn')?.addEventListener('click', () => this.saveTicket());
    document.getElementById('shareBtn')?.addEventListener('click', () => this.shareTicket());
    document.getElementById('playOnlineBtn')?.addEventListener('click', () => this.playTicketOnline(this.currentTicket!));
    document.querySelector('.filters-panel')?.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.type === 'range') {
            const display = document.getElementById(`${target.id}Value`);
            if (display) display.textContent = target.value;
        }
        this.updateFilterStateFromUI();
    });
    document.querySelector('.filters-panel')?.addEventListener('click', e => {
        // FIX: Cast to HTMLElement to access classList
       const target = e.target as HTMLElement;
       if(target.classList.contains('filter-chip')) {
           target.classList.toggle('active');
           this.updateFilterStateFromUI();
       }
    });
    document.getElementById('disclaimerBtn')?.addEventListener('click', () => this.toggleModal('disclaimerModal', true));
    document.getElementById('disclaimerCloseBtn')?.addEventListener('click', () => this.toggleModal('disclaimerModal', false));
    document.getElementById('cancelValidationBtn')?.addEventListener('click', () => this.toggleModal('validationModal', false));
    document.getElementById('confirmValidationBtn')?.addEventListener('click', () => this.confirmValidation());
    // FIX: Cast e.target to HTMLInputElement to access files
    document.getElementById('fileInput')?.addEventListener('change', e => (e.target as HTMLInputElement).files!.length > 0 && this.loadRealData((e.target as HTMLInputElement).files!));
    document.getElementById('exportTicketsBtn')?.addEventListener('click', () => this.exportTickets());
    
    // Tutorial Events
    document.getElementById('showTutorialBtn')?.addEventListener('click', () => this.startTutorial());
    document.getElementById('tutorialNextBtn')?.addEventListener('click', () => this.nextTutorialStep());
    document.getElementById('tutorialPrevBtn')?.addEventListener('click', () => this.prevTutorialStep());
    document.getElementById('tutorialSkipBtn')?.addEventListener('click', () => this.endTutorial());

  }

  // ===== FILTROS (Reactivados y completos) =====
  updateFilterStateFromUI() {
      // FIX: Added type safety for DOM element access.
      const getVal = (id: string, isFloat = false): number => {
          const el = document.getElementById(id) as HTMLInputElement;
          if (!el) return isFloat ? 0.0 : 0;
          return isFloat ? parseFloat(el.value) : parseInt(el.value);
      };
      const getChecked = (id: string): boolean => (document.getElementById(id) as HTMLInputElement)?.checked || false;
      const getActiveChips = (selector: string): string[] => Array.from(document.querySelectorAll(selector)).map(el => (el as HTMLElement).dataset.value!);

      this.filters.terminaciones = getActiveChips('#terminacionesOptions .filter-chip.active').map(Number);
      this.filters.terminacionesDistintas = getActiveChips('#terminacionesDistintasOptions .filter-chip.active').map(Number);
      this.filters.sum = { min: getVal('sumMin'), max: getVal('sumMax') };
      this.filters.parImpar = getActiveChips('#parImparOptions .filter-chip.active');
      this.filters.bajosAltos = getActiveChips('#bajosAltosOptions .filter-chip.active');
      this.filters.primos = { min: getVal('primosMin'), max: getVal('primosMax') };
      this.filters.consecutivos = getActiveChips('#consecutivosOptions .filter-chip.active');
      this.filters.distancia = { min: getVal('distanciaMin'), max: getVal('distanciaMax') };
      this.filters.agrupDecenas = getActiveChips('#agrupDecenasOptions .filter-chip.active');
      this.filters.sumaDigitos = { min: getVal('sumaDigitosMin'), max: getVal('sumaDigitosMax') };
      this.filters.desviacion = { min: getVal('desviacionMin', true), max: getVal('desviacionMax', true) };
      this.filters.entropy = { min: getVal('entropyMin', true), max: getVal('entropyMax', true) };
      
      const geometricChips = Array.from(document.querySelectorAll('#geometricOptions .filter-chip.active')) as HTMLElement[];
      this.filters.geometric = {
          exclude: geometricChips.filter(el => el.textContent!.startsWith('🚫')).map(el => el.dataset.value!),
          favor: geometricChips.filter(el => el.textContent!.startsWith('👍')).map(el => el.dataset.value!),
      };
      
      this.filters.useMarkov = getChecked('useMarkovSwitch');
      this.filters.useNash = getChecked('useNashSwitch');
      this.filters.useRegression = getChecked('useRegressionSwitch');
      
      this.filters.ai.markovDepth = getVal('markovDepth');
      this.filters.ai.nashWeight = getVal('nashWeight');
      this.filters.ai.regressionBonus = getVal('regressionBonus');

      this.saveState();
  }

  // ===== SELECCIÓN DE NÚMEROS (CORREGIDO) =====
  handleNumberClick(ball: HTMLElement) {
    const number = parseInt(ball.dataset.number!);
    const icon = ball.querySelector('.number-icon');
    if (!icon) return;
    
    if (this.excludedNumbers.has(number) && this.currentSelectionMode !== 'excluded') {
        this.showToast('Este número está excluido.', 'warning');
        return;
    }

    switch (this.currentSelectionMode) {
        case 'excluded':
            if (this.selectedNumbers.has(number)) {
                this.showToast('No puedes excluir un número ya seleccionado.', 'warning');
                return;
            }
            this.excludedNumbers.has(number) ? this.excludedNumbers.delete(number) : this.excludedNumbers.add(number);
            ball.classList.toggle('excluded');
            if (this.excludedNumbers.has(number)) {
                icon.textContent = '🚫';
            } else {
                 if (this.hotNumbers.has(number)) icon.textContent = '🔥';
                 else if (this.absentNumbers.has(number)) icon.textContent = '👻';
                 else if (this.coldNumbers.has(number)) icon.textContent = '❄️';
                 else icon.textContent = '';
            }
            break;

        case 'hot':
            if (this.coldNumbers.has(number)) { this.coldNumbers.delete(number); ball.classList.remove('cold'); }
            if (this.absentNumbers.has(number)) { this.absentNumbers.delete(number); ball.classList.remove('absent'); }
            this.hotNumbers.has(number) ? this.hotNumbers.delete(number) : this.hotNumbers.add(number);
            ball.classList.toggle('hot');
            icon.textContent = this.hotNumbers.has(number) ? '🔥' : '';
            break;

        case 'cold':
            if (this.hotNumbers.has(number)) { this.hotNumbers.delete(number); ball.classList.remove('hot'); }
            if (this.absentNumbers.has(number)) { this.absentNumbers.delete(number); ball.classList.remove('absent'); }
            this.coldNumbers.has(number) ? this.coldNumbers.delete(number) : this.coldNumbers.add(number);
            ball.classList.toggle('cold');
            icon.textContent = this.coldNumbers.has(number) ? '❄️' : '';
            break;
            
        case 'absent':
            if (this.hotNumbers.has(number)) { this.hotNumbers.delete(number); ball.classList.remove('hot'); }
            if (this.coldNumbers.has(number)) { this.coldNumbers.delete(number); ball.classList.remove('cold'); }
            this.absentNumbers.has(number) ? this.absentNumbers.delete(number) : this.absentNumbers.add(number);
            ball.classList.toggle('absent');
            icon.textContent = this.absentNumbers.has(number) ? '👻' : '';
            break;

        case 'figure':
            this.selectedNumbers.has(number) ? this.selectedNumbers.delete(number) : this.selectedNumbers.add(number);
            ball.classList.toggle('figure-selection');
            this.updateSelectedDisplay();
            break;

        default: // Normal selection mode
            if (this.excludedNumbers.has(number)) return;
            if (document.querySelector('.random-pick, .generated-pick')) {
                this.clearGridHighlights();
                this.selectedNumbers.clear();
            }
            this.selectedNumbers.has(number) ? this.removeNumber(number) : this.addNumber(number);
            break;
    }
  }
  addNumber(number: number) {
    if (this.selectedNumbers.size < 6) {
      this.selectedNumbers.add(number);
      document.querySelector(`.number-ball[data-number="${number}"]`)?.classList.add('selected');
      this.updateSelectedDisplay();
      this.updateStats();
    }
  }
  removeNumber(number: number) {
    this.selectedNumbers.delete(number);
    document.querySelector(`.number-ball[data-number="${number}"]`)?.classList.remove('selected');
    this.updateSelectedDisplay();
    this.updateStats();
  }
  clearSelections(fullClear: boolean) {
    this.selectedNumbers.clear();
    document.querySelectorAll('.number-ball.figure-selection').forEach(b => b.classList.remove('figure-selection'));
    if (fullClear) {
      this.excludedNumbers.clear();
      this.hotNumbers.clear();
      this.coldNumbers.clear();
      this.absentNumbers.clear();
      document.querySelectorAll('.number-ball').forEach(b => {
          b.classList.remove('excluded', 'hot', 'cold', 'absent');
          const icon = b.querySelector('.number-icon');
          if (icon) icon.textContent = '';
      });
    }
    document.querySelectorAll('.number-ball.selected').forEach(b => b.classList.remove('selected'));
    this.clearGridHighlights();
    this.updateSelectedDisplay();
    this.updateStats();
  }
  randomSelect() {
    this.clearSelections(false);
    const available = this.getAvailableUniverse();
    if (available.length < 6) {
      this.showToast('No hay suficientes números para seleccionar 6 al azar.', 'warning');
      return;
    }
    
    const randomNumbers: number[] = [];
    while (randomNumbers.length < 6) {
      const randomIndex = Math.floor(Math.random() * available.length);
      const number = available.splice(randomIndex, 1)[0];
      randomNumbers.push(number);
      const ball = document.querySelector(`.number-ball[data-number="${number}"]`);
      if (ball) {
        ball.classList.add('random-pick');
        const icon = ball.querySelector('.number-icon');
        if (icon) icon.textContent = '🎲';
      }
    }
    
    this.selectedNumbers = new Set(randomNumbers);
    this.updateTopDisplayWithCombination(randomNumbers, 'random');
    this.updateStats();
  }
  updateSelectionMode(mode: 'excluded' | 'hot' | 'cold' | 'figure' | 'absent') {
    const isTogglingOff = this.currentSelectionMode === mode;
    
    // Clear previous mode state
    if (this.currentSelectionMode === 'figure') {
        this.clearSelections(false); // Clear figure selections
    }
    this.currentSelectionMode = null;

    document.querySelectorAll('.selection-mode-btn[data-mode]').forEach(b => {
        // FIX: Cast to HTMLElement to access dataset
        const btn = b as HTMLElement;
        if (['cold', 'hot', 'excluded', 'figure', 'absent'].includes(btn.dataset.mode!)) {
            btn.classList.remove('active');
        }
    });

    if (isTogglingOff) {
        this.showToast('Modo de selección normal activado', 'info');
    } else {
        this.currentSelectionMode = mode;
        document.querySelector(`.selection-mode-btn[data-mode="${mode}"]`)?.classList.add('active');
        const modeText = {
            excluded: 'marcar números excluidos',
            hot: 'marcar números Calientes',
            cold: 'marcar números Fríos',
            figure: 'dibujar una Figura',
            absent: 'marcar números Ausentes'
        };
        this.showToast(`Modo para ${modeText[mode]} activado`, 'info');
        if (mode === 'figure') {
            this.clearSelections(false);
        }
    }
  }
  updateSelectedDisplay() {
    const display = document.getElementById('selectedDisplay');
    if (!display) return;
    display.innerHTML = '';
    
    if (this.currentSelectionMode === 'figure') {
        const count = this.selectedNumbers.size;
        display.innerHTML = `<div style="color:#666; font-style: italic;">${count} números seleccionados para la figura.</div>`;
        return;
    }
    
    if (this.selectedNumbers.size === 0) {
      display.innerHTML = `<div style="color:#666; font-style: italic;">Selecciona hasta 6 números</div>`;
    } else {
      Array.from(this.selectedNumbers).sort((a,b)=>a-b).forEach(num => {
        const ball = document.createElement('div');
        ball.classList.add('number-ball', 'selected');
        ball.style.cssText = 'width: 35px; height: 35px; cursor: default;';
        ball.textContent = String(num);
        display.appendChild(ball);
      });
    }
  }

  updateTopDisplayWithCombination(combination: number[], type = 'generated') {
    const display = document.getElementById('selectedDisplay');
    if (!display) return;
    display.innerHTML = '';
    if (!combination || combination.length === 0) {
        display.innerHTML = `<div style="color:#666; font-style: italic;">No se generó ninguna combinación.</div>`;
        return;
    }

    const className = type === 'random' ? 'random-pick' : 'generated-pick';

    combination.sort((a, b) => a - b).forEach(num => {
        const ball = document.createElement('div');
        ball.classList.add('number-ball', className);
        ball.style.cssText = 'width: 35px; height: 35px; cursor: default;';
        ball.textContent = String(num);
        display.appendChild(ball);
    });
  }

  // ===== UI STRATEGY =====
  updateStrategyUI(strategy: string) {
    document.querySelectorAll('.strategy-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.strategy-btn[data-strategy="${strategy}"]`)?.classList.add('active');
    const winningOptions = document.getElementById('winningOptions') as HTMLElement;
    const multipleOptions = document.getElementById('multipleNumbersOptions') as HTMLElement;
    const generateBtn = document.getElementById('generateBtn');

    if(winningOptions) winningOptions.style.display = strategy === 'winning' ? 'block' : 'none';
    if(multipleOptions) multipleOptions.style.display = strategy === 'multiple' ? 'block' : 'none';
    
    if (generateBtn) {
        generateBtn.innerHTML = `<span>🤞 Generar Combinación</span>`;
    }
  }
  
  // ===========================================
  // ===== MOTOR DE GENERACIÓN (CORREGIDO) =====
  // ===========================================
  async generateCombinations() {
    if (this.isGenerating) return;
    
    this.showFilterSpinner();
    // Don't clear selections if in figure mode, as they ARE the universe
    if (this.currentSelectionMode !== 'figure') {
        this.clearSelections(false);
    }

    this.isGenerating = true;
    this.showLoading('Iniciando...');
    
    this.updateFilterStateFromUI();
    const availableUniverse = this.getAvailableUniverse();

    if (availableUniverse.length < 6) {
      this.showToast('Imposible generar. Menos de 6 números disponibles con los filtros actuales.', 'error');
      this.hideLoading();
      this.isGenerating = false;
      this.hideFilterSpinner();
      return;
    }

    const strategy = (document.querySelector('.strategy-btn.active') as HTMLElement)?.dataset.strategy;
    let combinations: number[][] = [];

    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      if (strategy === 'simple') {
          this.showLoading('Buscando combinación...');
          const result = this.findValidCombinations(availableUniverse, 1, 500000);
          if (result.length > 0) combinations = result;
      } else if (strategy === 'winning') {
          const generateCount = parseInt((document.getElementById('generateCount') as HTMLInputElement)?.value || '100');
          const playCount = parseInt((document.getElementById('playCount') as HTMLInputElement)?.value || '10');
          combinations = await this.findAndRankWinningCombinations(availableUniverse, generateCount, playCount);
      } else if (strategy === 'multiple') {
        const numCount = parseInt((document.querySelector('.number-option.active') as HTMLElement)?.dataset.numbers || '7');
        if (availableUniverse.length < numCount) {
          throw new Error(`No hay suficientes números (${availableUniverse.length}) para una múltiple de ${numCount}.`);
        }
        const foundSuperset = await this.findValidSuperset(availableUniverse, numCount);
        if (foundSuperset) {
            combinations = [foundSuperset];
        }
      }

      if (combinations.length > 0) {
        this.displayTicket(combinations, strategy!);
      } else {
         this.showToast('No se encontró ninguna combinación que cumpla todos los filtros. Prueba a flexibilizarlos.', 'warning');
      }

    } catch (error: any) {
        this.showToast(`Error: ${error.message}`, 'error');
    } finally {
        this.hideLoading();
        this.isGenerating = false;
        this.hideFilterSpinner();
    }
  }

  getAvailableUniverse(): number[] {
    // If in figure mode, the universe is the selected numbers
    if (this.currentSelectionMode === 'figure' && this.selectedNumbers.size > 0) {
        return Array.from(this.selectedNumbers);
    }
    
    let universe: number[] = [];
    for (let i = 1; i <= 49; i++) {
      if (this.excludedNumbers.has(i)) continue;
      // FIX: Check if terminaciones is defined and has elements.
      if (this.filters.terminaciones && this.filters.terminaciones.length > 0 && this.filters.terminaciones.includes(i % 10)) continue;
      universe.push(i);
    }
    return universe;
  }

  async findAndRankWinningCombinations(universe: number[], generateCount: number, playCount: number): Promise<number[][]> {
    this.showLoading(`Buscando ${generateCount} válidas...`);
    const loadingInfo = document.getElementById('loadingInfo');

    const validCombos: number[][] = [];
    const maxAttempts = Math.max(500000, generateCount * 100);
    
    for(let i=0; i < maxAttempts && validCombos.length < generateCount; i++) {
        if (i % 500 === 0) {
            if (loadingInfo) loadingInfo.textContent = `${validCombos.length} / ${generateCount} encontradas... (Intento ${i})`;
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        const combo = this.generateRandomCombination(universe, 6);
        if (this.isValidCombination(combo)) {
            validCombos.push(combo);
        }
    }

    if (validCombos.length === 0) {
        throw new Error('No se encontraron combinaciones válidas. Intenta flexibilizar los filtros.');
    }

    this.showLoading('Puntuando y ordenando...');
    if (loadingInfo) loadingInfo.textContent = `Puntuando ${validCombos.length} combinaciones...`;
    await new Promise(resolve => setTimeout(resolve, 0));

    const scoredCombos = validCombos.map(combo => ({
        combo,
        score: this.calculateCombinationScore(combo)
    }));

    scoredCombos.sort((a, b) => b.score - a.score);
    return scoredCombos.slice(0, playCount).map(item => item.combo);
  }

  async findValidSuperset(universe: number[], numCount: number): Promise<number[] | null> {
    this.showLoading(`Buscando Múltiple de ${numCount}...`);
    const loadingInfo = document.getElementById('loadingInfo');
    
    const tolerance = this.TOLERANCE_LEVELS[numCount];
    const maxAttempts = 50000;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (attempt % 100 === 0) {
            if(loadingInfo) loadingInfo.textContent = `Intento ${attempt} de ${maxAttempts}...`;
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        const candidateSuperset = this.generateRandomCombination(universe, numCount);
        const subCombinations = this.getCombinations(candidateSuperset, 6);
        const totalSubCombos = subCombinations.length;
        const requiredValidCount = Math.ceil(totalSubCombos * tolerance);
        
        let validCount = 0;
        for (const subCombo of subCombinations) {
            if (this.isValidCombination(subCombo)) {
                validCount++;
            }
        }

        if (validCount >= requiredValidCount) {
            if(loadingInfo) loadingInfo.textContent = `¡Superconjunto válido encontrado!`;
            return candidateSuperset.sort((a, b) => a - b);
        }
    }
    if(loadingInfo) loadingInfo.textContent = `Búsqueda finalizada sin éxito.`;
    return null;
  }

  findValidCombinations(universe: number[], count: number, maxAttempts: number): number[][] {
      const validCombinations: number[][] = [];
      for (let i = 0; i < maxAttempts && validCombinations.length < count; i++) {
          const combo = this.generateRandomCombination(universe, 6);
          if (this.isValidCombination(combo)) {
              validCombinations.push(combo);
          }
      }
      return validCombinations;
  }
  
  isValidCombination(combination: number[]): boolean {
      if (combination.length !== 6) return false;
      
      const stats = this.getCombinationStats(combination);
      if (Object.keys(stats).length === 0) return false;

      // Nivel 1 - Terminaciones
      const uniqueEndings = new Set(combination.map(n => n % 10)).size;
      if (this.filters.terminacionesDistintas.length > 0 && !this.filters.terminacionesDistintas.includes(uniqueEndings)) return false;

      // Nivel 2
      if (stats.suma < this.filters.sum.min || stats.suma > this.filters.sum.max) return false;
      if (this.filters.parImpar.length > 0 && !this.filters.parImpar.includes(stats.parImpar)) return false;
      if (this.filters.bajosAltos.length > 0 && !this.filters.bajosAltos.includes(stats.bajosAltos)) return false;
      if (stats.primos < this.filters.primos.min || stats.primos > this.filters.primos.max) return false;
      if (this.filters.consecutivos.length > 0 && !this.filters.consecutivos.includes(stats.consecutivos)) return false;
      
      const sortedCombo = [...combination].sort((a,b) => a-b);
      for (let i = 0; i < sortedCombo.length - 1; i++) {
        const diff = sortedCombo[i+1] - sortedCombo[i];
        if (diff < this.filters.distancia.min || diff > this.filters.distancia.max) return false;
      }
      
      if (this.filters.agrupDecenas.length > 0 && !this.filters.agrupDecenas.includes(stats.agrupDecenas)) return false;
      if (stats.sumaDigitos < this.filters.sumaDigitos.min || stats.sumaDigitos > this.filters.sumaDigitos.max) return false;
      
      // Nivel 3 Exclusions
      if (stats._desviacion < this.filters.desviacion.min || stats._desviacion > this.filters.desviacion.max) return false;
      if (stats._entropia < this.filters.entropy.min || stats._entropia > this.filters.entropy.max) return false;
      if (this.filters.geometric.exclude.length > 0 && this.hasGeometricPattern(combination, this.filters.geometric.exclude)) return false;

      return true;
  }

  generateRandomCombination(universe: number[], count: number): number[] {
    let tempUniverse = [...universe];
    let combination: number[] = [];
    while (combination.length < count && tempUniverse.length > 0) {
      const randomIndex = Math.floor(Math.random() * tempUniverse.length);
      combination.push(tempUniverse.splice(randomIndex, 1)[0]);
    }
    return combination.sort((a, b) => a - b);
  }
  
  // FIX: Added strong types to function signature and internals.
  getCombinations(source: number[], k: number): number[][] {
    if (k > source.length || k <= 0) return [];
    if (k === source.length) return [source];
    if (k === 1) return source.map(item => [item]);

    const result: number[][] = [];
    const stack: [number, number[]][] = [[0, []]];
    while (stack.length > 0) {
        const [index, currentCombo] = stack.pop()!;

        if (currentCombo.length === k) {
            result.push(currentCombo);
            continue;
        }
        if (index >= source.length) continue;

        stack.push([index + 1, currentCombo]);
        stack.push([index + 1, [...currentCombo, source[index]]]);
    }
    return result;
  }
  
  // ===== ESTADÍSTICAS Y VALIDACIÓN (CORREGIDO) =====
  updateStats() {
    this.displayCombinationStats(Array.from(this.selectedNumbers));
  }

  displayCombinationStats(combination: number[]) {
    const statsContent = document.getElementById('statsContent');
    if (!statsContent) return;
    
    const safeSetText = (id: string, text: string | number) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(text);
    };
    
    if (!combination || combination.length !== 6) {
        statsContent.querySelectorAll('.stat-value').forEach(el => el.textContent = '-');
        return;
    }
    const stats = this.getCombinationStats(combination);
    for (const key in stats) {
        if (key.startsWith('_')) continue; // No mostrar valores raw
        const elId = `stat${key.charAt(0).toUpperCase() + key.slice(1)}`;
        // FIX: Cast stats[key] to any to satisfy safeSetText. The types are compatible.
        safeSetText(elId, (stats as any)[key]);
    }
  }

  getCombinationStats(combination: number[]) {
    if (combination.length !== 6) return {};
    const sum = combination.reduce((a, b) => a + b, 0);
    const evens = combination.filter(n => n % 2 === 0).length;
    const lows = combination.filter(n => n <= 25).length;
    const primesCount = combination.filter(n => this.primes.has(n)).length;
    
    const sorted = [...combination].sort((a,b)=>a-b);
    let consecutivePattern = '';
    let count = 1;
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i-1] + 1) {
            count++;
        } else {
            consecutivePattern += count;
            count = 1;
        }
    }
    consecutivePattern += count;
    // FIX: The sort method was attempting to subtract strings, which is a type error. Converted string characters to numbers before sorting.
    const consecPatternSorted = consecutivePattern.split('').sort((a,b)=>Number(b)-Number(a)).join('/');
    
    const tens: { [key: number]: number } = {};
    combination.forEach(n => {
        const ten = Math.floor((n-1)/10);
        tens[ten] = (tens[ten] || 0) + 1;
    });
    const tensGroups = Object.values(tens).sort((a,b)=>b-a).join('/');

    const digitSum = combination.reduce((sum, num) => sum + (num < 10 ? num : (num % 10 + Math.floor(num/10))), 0);
    
    const mean = sum / 6;
    const stdDev = Math.sqrt(combination.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / 6);

    const counts: { [key: number]: number } = {};
    combination.forEach(n => { counts[n] = (counts[n] || 0) + 1; });
    const entropy = -Object.values(counts).reduce((sum, count) => {
        const p = count / 6;
        return sum + p * Math.log2(p);
    }, 0);

    return {
      suma: sum,
      parImpar: `${evens}/${6-evens}`,
      bajosAltos: `${lows}/${6-lows}`,
      primos: primesCount,
      consecutivos: consecPatternSorted,
      agrupDecenas: tensGroups,
      sumaDigitos: digitSum,
      desviacion: stdDev.toFixed(2),
      entropia: entropy.toFixed(3),
      _desviacion: stdDev,
      _entropia: entropy,
    };
  }
  
  clearGridHighlights() {
    document.querySelectorAll('.number-ball.generated-pick, .number-ball.random-pick').forEach(ball => {
        ball.classList.remove('generated-pick', 'random-pick');
        const icon = ball.querySelector('.number-icon');
        if (!icon) return;

        // FIX: Cast to HTMLElement to access dataset
        const num = parseInt((ball as HTMLElement).dataset.number!);
        
        if(this.excludedNumbers.has(num)) {
            icon.textContent = '🚫';
        } else if(this.hotNumbers.has(num)) {
            icon.textContent = '🔥';
        } else if(this.absentNumbers.has(num)) {
            icon.textContent = '👻';
        } else if(this.coldNumbers.has(num)) {
            icon.textContent = '❄️';
        } else {
            icon.textContent = '';
        }
    });
  }
  
  // ===== TICKET & STORAGE =====
  displayTicket(combinations: number[][], strategy: string) {
    let finalCombinations = combinations;
    
    // YA NO EXPLOTAMOS AQUÍ LA MÚLTIPLE.
    // La dejamos tal cual para que se muestre como un bloque.
    // La validación se encargará de explotarla.

    this.currentTicket = { date: new Date().toISOString(), combinations: finalCombinations, strategy };

    const ticketDiv = document.getElementById('ticket');
    const combinationsDiv = document.getElementById('ticketCombinations');
    const ticketDateEl = document.getElementById('ticketDate');
    if (ticketDateEl) ticketDateEl.textContent = new Date().toLocaleString();
    
    if (!combinationsDiv || !ticketDiv) return;
    combinationsDiv.innerHTML = '';
    
    finalCombinations.forEach(combo => {
        const comboDiv = document.createElement('div');
        const isSystem = combo.length > 6;
        
        comboDiv.className = `ticket-combination ${isSystem ? 'system' : ''}`;
        
        if (isSystem) {
            const badge = document.createElement('div');
            badge.className = 'system-badge';
            badge.textContent = `Múltiple de ${combo.length} Números`;
            comboDiv.appendChild(badge);
        }

        combo.sort((a,b)=>a-b).forEach(num => {
            const numDiv = document.createElement('div');
            numDiv.className = 'ticket-number';
            numDiv.textContent = String(num);
            comboDiv.appendChild(numDiv);
        });
        combinationsDiv.appendChild(comboDiv);
    });
    
    this.clearGridHighlights();

    if (strategy !== 'multiple' && finalCombinations.length > 0) {
        this.updateTopDisplayWithCombination(finalCombinations[0], 'generated');
    } else if (strategy === 'multiple') {
        // Mostrar el superset generado en el display superior también
        if (finalCombinations.length > 0) {
             this.updateTopDisplayWithCombination(finalCombinations[0], 'generated');
        }
    } else {
        const display = document.getElementById('selectedDisplay');
        const message = strategy === 'multiple' ? 'Múltiple generada. Ver boleto.' : 'Selecciona hasta 6 números';
        if(display) display.innerHTML = `<div style="color:#666; font-style: italic;">${message}</div>`;
    }

    // Highlight picks
    if (finalCombinations.length > 0) {
        // If it's multiple, the first combination IS the superset.
        finalCombinations[0].forEach(num => {
            const ball = document.querySelector(`.number-ball[data-number="${num}"]`);
            if (ball) {
                ball.classList.add('generated-pick');
                const icon = ball.querySelector('.number-icon');
                if(icon) icon.textContent = '🤖';
            }
        });
        
        if (strategy === 'multiple') {
             // No stats for superset
             this.displayCombinationStats([]);
        } else {
            this.displayCombinationStats(finalCombinations[0]);
        }
    }
    
    ticketDiv.classList.add('show');
  }
  saveTicket() {
    if (!this.currentTicket) return;

    const drawDateEl = document.getElementById('ticketDrawDate') as HTMLInputElement;
    if (drawDateEl && drawDateEl.value) {
      this.currentTicket.drawDate = drawDateEl.value;
    }

    this.savedTickets.unshift(this.currentTicket);
    this.saveState();
    this.updateSavedTickets();
    this.currentTicket = null;
    const ticketDiv = document.getElementById('ticket');
    if(ticketDiv) ticketDiv.classList.remove('show');
    this.showToast('✅ Boleto guardado', 'success');
  }

  deleteTicket(date: string) {
    this.savedTickets = this.savedTickets.filter(t => t.date !== date);
    this.saveState();
    this.updateSavedTickets();
    this.showToast('Boleto eliminado', 'info');
  }

  updateSavedTicketsStats() {
    const statsSection = document.getElementById('savedTicketsStats') as HTMLElement;
    if (!statsSection) return;

    if (this.savedTickets.length === 0) {
        statsSection.style.display = 'none';
        return;
    }

    statsSection.style.display = 'block';

    const safeSetText = (id: string, text: string | number) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = String(text); // Use innerHTML to render styled text
    };

    // Calculate total combinations
    let totalCombinations = 0;
    this.savedTickets.forEach(ticket => {
        if (ticket.strategy === 'multiple' && ticket.combinations[0].length > 6) {
             // Calculate how many 6-number combos are in this multiple ticket
             const n = ticket.combinations[0].length;
             // nCr formula: n! / (r! * (n-r)!) where r=6
             let combos = 1;
             for(let i=0; i<6; i++) combos *= (n-i)/(i+1);
             totalCombinations += Math.round(combos);
        } else {
            totalCombinations += ticket.combinations.length;
        }
    });
    safeSetText('totalTicketsSaved', totalCombinations);

    // Strategy Distribution
    const strategyCounts: { [key: string]: number } = { simple: 0, winning: 0, multiple: 0 };
    const strategyMap: { [key: string]: string } = { simple: 'Simple', winning: 'E. Ganadora', multiple: 'Múltiple' };
    
    this.savedTickets.forEach(ticket => {
      if (strategyCounts.hasOwnProperty(ticket.strategy)) {
        strategyCounts[ticket.strategy] += ticket.combinations.length;
      } else {
        strategyCounts[ticket.strategy] = ticket.combinations.length;
      }
    });

    const mostUsed = Object.entries(strategyCounts).sort((a, b) => b[1] - a[1])[0];
    safeSetText('mostUsedStrategy', mostUsed && mostUsed[1] > 0 ? `${strategyMap[mostUsed[0]] || mostUsed[0]} (${mostUsed[1]})` : 'N/A');
    
    safeSetText('strategyDistribution', Object.entries(strategyCounts)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => `${strategyMap[key] || key}: ${value}`)
      .join(' | '));

    // Hit analysis
    // Note: For simplicity in this overview statistic, we won't explode multiples here unless already validated.
    const validatedTickets = this.savedTickets.filter(t => t.validation);
    const PROBS: { [key: number]: number } = { 3: 0.0176504, 4: 0.0009686, 5: 0.0000184, 6: 0.0000000715 };
    const hitCounts: { [key: number]: number } = { 3: 0, 4: 0, 5: 0, 6: 0 };
    let totalValidatedCombos = 0;

    validatedTickets.forEach(ticket => {
        // Handle Multiple specially if it has summary data
        if (ticket.strategy === 'multiple' && ticket.combinations[0].length > 6) {
             // To properly count hits in stats, we'd need to store the summary breakdown in the ticket validation object.
             // Currently `validation.hits` stores matches against the superset.
             // For this general stat display, we might skip detailed math for multiples to avoid complexity overflow here,
             // or simply check if `hits` > 6, which means it's a raw match count, not a combo result.
             // Let's skip multiples in this aggregate stats for now to keep it accurate for standard tickets.
        } else {
            totalValidatedCombos += ticket.combinations.length;
            ticket.validation!.hits.forEach(hitCount => {
                if (hitCounts.hasOwnProperty(hitCount)) {
                    hitCounts[hitCount]++;
                }
            });
        }
    });

    if (totalValidatedCombos > 0) {
        Object.keys(PROBS).forEach(tierStr => {
            const tier = parseInt(tierStr);
            const count = hitCounts[tier];
            const userRate = count / totalValidatedCombos;
            const statRate = (PROBS as any)[tier];
            
            let colorStyle = '';
            let performanceIndicator = '';

            if (userRate > statRate) {
                colorStyle = 'style="color: #166534;"'; // dark green
                performanceIndicator = '👍';
            } else if (userRate > 0 && userRate < statRate) {
                colorStyle = 'style="color: #991b1b;"'; // dark red
                performanceIndicator = '👎';
            }

            const userRatePercent = (userRate * 100).toFixed(4);
            const statRatePercent = (statRate * 100).toFixed(4);

            const text = `<span ${colorStyle}>${count} <small>(${userRatePercent}%)</small></span> <small>vs. ${statRatePercent}%</small> ${performanceIndicator}`;
            safeSetText(`hits${tier}`, text);
        });
    } else {
        safeSetText('hits3', 'N/A');
        safeSetText('hits4', 'N/A');
        safeSetText('hits5', 'N/A');
        safeSetText('hits6', 'N/A');
    }
}


  updateSavedTickets() {
    this.updateSavedTicketsStats();
    const container = document.getElementById('savedTickets');
    if (!container) return;
    container.innerHTML = '';
    if (this.savedTickets.length === 0) {
      container.innerHTML = '<div style="color:#666; text-align: center; padding: 20px;">No tienes boletos guardados</div>';
      return;
    }

    const strategyMap: { [key: string]: string } = {
        simple: 'Simple',
        winning: 'E. Ganadora',
        multiple: 'Múltiple'
    };

    this.savedTickets.forEach(ticket => {
      const item = document.createElement('div');
      item.className = 'saved-ticket-item';
      const strategyName = strategyMap[ticket.strategy] || ticket.strategy;
      const strategyHTML = `<span class="saved-ticket-strategy">${strategyName}</span>`;
      const drawDateHTML = ticket.drawDate ? `<span class="saved-ticket-draw-date">Sorteo: ${new Date(ticket.drawDate + 'T00:00:00').toLocaleDateString()}</span>` : '';

      let combosHTML = '';
      let actionsHTML = '';
      const playOnlineHTML = `<button class="play-online-btn-saved">🔗 Jugar Online</button>`;

      // Check if it's a system ticket (Multiple with > 6 numbers)
      const isSystemTicket = ticket.combinations.length > 0 && ticket.combinations[0].length > 6;

      if (isSystemTicket) {
          // === VISUALIZACIÓN MÚLTIPLE ===
          const superset = ticket.combinations[0];
          let summaryTableHTML = '';
          let validationClass = '';
          let validationStatusBtn = `<button class="validate">Validar</button>`;
          let supersetDisplayClass = '';

          if (ticket.validation) {
             const winningNumbersSet = new Set(ticket.validation.winningNumbers);
             validationClass = 'verified';
             validationStatusBtn = `<button class="validate verified" disabled>Verificado</button>`;

             // Generate breakdown summary
             const explodedCombos = this.getCombinations(superset, 6);
             const breakdown = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
             explodedCombos.forEach(c => {
                 const hits = c.filter(n => winningNumbersSet.has(n)).length;
                 (breakdown as any)[hits]++;
             });
             
             const totalMatchesInSuperset = superset.filter(n => winningNumbersSet.has(n)).length;
             
             summaryTableHTML = `
                <div style="margin-top: 10px; font-weight: bold; color: var(--primary);">
                    🎯 ${totalMatchesInSuperset} aciertos sobre los ${superset.length} números seleccionados.
                </div>
                <table class="validation-summary-table">
                    <tr>
                        <th>Aciertos</th>
                        <th>Cantidad</th>
                    </tr>
                    <tr class="${breakdown[6] > 0 ? 'row-highlight' : ''}"><td>6 Aciertos</td><td>${breakdown[6]}</td></tr>
                    <tr class="${breakdown[5] > 0 ? 'row-highlight' : ''}"><td>5 Aciertos</td><td>${breakdown[5]}</td></tr>
                    <tr class="${breakdown[4] > 0 ? 'row-highlight' : ''}"><td>4 Aciertos</td><td>${breakdown[4]}</td></tr>
                    <tr class="${breakdown[3] > 0 ? 'row-highlight' : ''}"><td>3 Aciertos</td><td>${breakdown[3]}</td></tr>
                     <tr><td>0-2 Aciertos</td><td>${breakdown[0]+breakdown[1]+breakdown[2]}</td></tr>
                </table>
             `;
             
             // Highlight matching balls in the main display
             combosHTML = `
                <div class="system-badge">Múltiple de ${superset.length} - ${explodedCombos.length} apuestas</div>
                <div class="saved-combination" style="flex-wrap: wrap; justify-content: center;">
                    <div class="saved-combination-content" style="flex-wrap: wrap; justify-content: center;">
                        ${superset.map(n => `<div class="saved-combination-number ${winningNumbersSet.has(n) ? 'selected' : ''}">${n}</div>`).join('')}
                    </div>
                </div>
                ${summaryTableHTML}
             `;

          } else {
             // Not validated yet
              combosHTML = `
                <div class="system-badge">Múltiple de ${superset.length}</div>
                <div class="saved-combination" style="flex-wrap: wrap; justify-content: center;">
                    <div class="saved-combination-content" style="flex-wrap: wrap; justify-content: center;">
                        ${superset.map(n => `<div class="saved-combination-number">${n}</div>`).join('')}
                    </div>
                </div>
             `;
          }
          
          actionsHTML = `${playOnlineHTML}${validationStatusBtn}`;

      } else {
          // === VISUALIZACIÓN ESTÁNDAR (SIMPLE / GANADORA) ===
          if (ticket.validation) {
            const winningNumbersSet = new Set(ticket.validation.winningNumbers);
            combosHTML = ticket.combinations.map((combo, index) => {
                const hits = ticket.validation!.hits[index];
                const hitClass = hits >= 3 ? 'high-hits' : hits > 0 ? 'low-hits' : 'no-hits';
                return `<div class="saved-combination">
                            <div class="saved-combination-content">${combo.map(n => `<div class="saved-combination-number ${winningNumbersSet.has(n) ? 'selected' : ''}">${n}</div>`).join('')}</div>
                            <div class="hit-count ${hitClass}">${hits} aciertos</div>
                        </div>`;
            }).join('');
            actionsHTML = `${playOnlineHTML}<button class="validate verified" disabled>Verificado</button>`;
          } else {
            combosHTML = ticket.combinations.map(combo => `<div class="saved-combination"><div class="saved-combination-content">${combo.map(n => `<div class="saved-combination-number">${n}</div>`).join('')}</div></div>`).join('');
            actionsHTML = `${playOnlineHTML}<button class="validate">Validar</button>`;
          }
      }
      
      item.innerHTML = `
        <div class="saved-ticket-header">
            <div>
              <span class="saved-ticket-date">${new Date(ticket.date).toLocaleString()}</span>
              ${drawDateHTML}
            </div>
            <div class="saved-ticket-actions">
              ${actionsHTML}
              <button class="delete-btn">X</button>
              <button class="toggle-btn">+</button>
            </div>
        </div>
        <div class="saved-ticket-details">
            ${strategyHTML}
        </div>
        <div class="saved-combinations">${combosHTML}</div>`;
      
      item.querySelector('.delete-btn')?.addEventListener('click', () => this.deleteTicket(ticket.date));
      item.querySelector('.play-online-btn-saved')?.addEventListener('click', () => this.playTicketOnline(ticket));
      const validateBtn = item.querySelector('.validate:not(.verified)');
      if(validateBtn) {
          validateBtn.addEventListener('click', () => this.startValidation(ticket.date));
      }
      item.querySelector('.toggle-btn')?.addEventListener('click', (e) => {
          const comboDiv = item.querySelector('.saved-combinations') as HTMLElement;
          const target = e.target as HTMLElement;
          if (!comboDiv || !target) return;
          const isVisible = comboDiv.style.display === 'block';
          comboDiv.style.display = isVisible ? 'none' : 'block';
          target.textContent = isVisible ? '+' : '-';
      });
      container.appendChild(item);
    });
  }

  autoValidateSavedTickets() {
    if (!this.historicalData || this.historicalData.length === 0) return;

    let validatedCount = 0;
    const historicalDrawsByDate: { [key: string]: number[] } = {};
    this.historicalData.forEach(draw => {
        const drawDateStr = new Date(draw.date.getTime() - (draw.date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        historicalDrawsByDate[drawDateStr] = draw.numbers;
    });

    this.savedTickets.forEach(ticket => {
        if (ticket.validation) return; 

        let winningNumbers: number[] | null = null;

        if (ticket.drawDate) {
            if (historicalDrawsByDate[ticket.drawDate]) {
                winningNumbers = historicalDrawsByDate[ticket.drawDate];
            }
        } else {
            const ticketCreationDate = new Date(ticket.date);
            const sortedDrawDates = Object.keys(historicalDrawsByDate).sort();
            const matchingDrawDateStr = sortedDrawDates.find(drawDateStr => {
                const drawDate = new Date(drawDateStr + 'T00:00:00');
                return drawDate >= ticketCreationDate;
            });
            
            if (matchingDrawDateStr) {
                winningNumbers = historicalDrawsByDate[matchingDrawDateStr];
            }
        }

        if (winningNumbers) {
            // Note: For system tickets, this returns matches against the superset, not per exploded line.
            // The UI (updateSavedTickets) handles the explosion and summary table.
            const hits = ticket.combinations.map(combo =>
                combo.filter(n => winningNumbers!.includes(n)).length
            );
            ticket.validation = {
                winningNumbers,
                hits
            };
            validatedCount++;
        }
    });

    if (validatedCount > 0) {
        this.saveState();
        this.updateSavedTickets();
        this.showToast(`✅ ${validatedCount} boleto(s) han sido validados automáticamente.`, 'success');
    }
}

  startValidation(date: string) {
    this.currentValidatingTicket = this.savedTickets.find(t => t.date === date) || null;
    if (!this.currentValidatingTicket) return;
    
    const validationResults = document.getElementById('validationResults');
    if(validationResults) validationResults.innerHTML = '';
    const winningNumbersInput = document.getElementById('winningNumbersInput') as HTMLInputElement;
    if(winningNumbersInput) winningNumbersInput.value = '';
    this.toggleModal('validationModal', true);
  }
  confirmValidation() {
    const inputEl = document.getElementById('winningNumbersInput') as HTMLInputElement;
    if (!inputEl || !this.currentValidatingTicket) return;
    const winningNumbers = new Set(inputEl.value.split(/[ ,.]+/).map(n => parseInt(n)).filter(n => !isNaN(n) && n > 0 && n < 50));
    if (winningNumbers.size !== 6) {
      this.showToast('Introduce 6 números ganadores válidos.', 'error');
      return;
    }

    const ticketToUpdate = this.savedTickets.find(t => t.date === this.currentValidatingTicket!.date);
    if (ticketToUpdate) {
        // Note: This stores raw hits. For system tickets, it's matches in the superset.
        const hits = ticketToUpdate.combinations.map(combo =>
            combo.filter(n => winningNumbers.has(n)).length
        );
        ticketToUpdate.validation = {
            winningNumbers: Array.from(winningNumbers),
            hits
        };
        this.saveState();
        this.updateSavedTickets();
        this.toggleModal('validationModal', false);
        this.showToast('Boleto validado manualmente.', 'success');
    } else {
        this.showToast('Error al encontrar el boleto para validar.', 'error');
    }
  }
  shareTicket() {
      if (!this.currentTicket) return;
      const text = `Mi boleto DataLotto49:\n${this.currentTicket.combinations.map(c => c.join(' - ')).join('\n')}`;
      if (navigator.share) {
          navigator.share({ title: 'Mi Boleto DataLotto49', text }).catch(console.error);
      } else {
          navigator.clipboard.writeText(text).then(() => this.showToast('Boleto copiado al portapapeles', 'success'));
      }
  }

  playTicketOnline(ticket: Ticket) {
    if (!ticket || ticket.combinations.length === 0) {
        this.showToast('No hay combinaciones para jugar.', 'warning');
        return;
    }

    const lotteryUrl = 'https://juegos.loteriasyapuestas.es/jugar/bonoloto/apuesta';
    
    let combosToPlay = ticket.combinations;

    // If it's a system ticket (multiple), we need to explode it for the clipboard
    // OR, just put the superset if the lottery site supports bulk entry (usually not).
    // Standard behavior: explode it.
    if (ticket.combinations.length === 1 && ticket.combinations[0].length > 6) {
        combosToPlay = this.getCombinations(ticket.combinations[0], 6);
    }

    const formattedCombinations = combosToPlay
        .map(combo => 
            combo.sort((a, b) => a - b)
                 .map(n => String(n).padStart(2, '0'))
                 .join(' ')
        )
        .join('\n');

    navigator.clipboard.writeText(formattedCombinations)
        .then(() => {
            window.open(lotteryUrl, '_blank');
            this.showToast('🌐 Web oficial abierta. ¡Combinaciones copiadas!', 'success');
        })
        .catch(err => {
            console.error('Error al copiar al portapapeles:', err);
            this.showToast('Error al copiar las combinaciones.', 'error');
        });
  }

  exportTickets() {
    if (this.savedTickets.length === 0) {
        this.showToast('No hay boletos para exportar.', 'warning');
        return;
    }
    try {
        const dataStr = JSON.stringify(this.savedTickets, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `datalotto49_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast('✅ Boletos exportados correctamente.', 'success');
    } catch (error) {
        this.showToast('Error al exportar los boletos.', 'error');
        console.error('Export error:', error);
    }
  }


  // ===== HELPERS UI & GEOMETRIC/AI =====
  hasGeometricPattern(combination: number[], patternsToExclude: string[]): boolean {
      const coords = combination.map(n => DataLotto49Advanced.NUMBER_COORDS[n]);
      const patternChecks: { [key: string]: () => boolean } = {
          lineas: () => this.isLine(coords),
          diagonales: () => this.isDiagonal(coords),
          triangulos: () => false, // No implementado para exclusión
          circulos: () => false,   // No implementado para exclusión
          cruces: () => false,     // No implementado para exclusión
      };
      for (const pattern of patternsToExclude) {
          if (patternChecks[pattern] && patternChecks[pattern]()) return true;
      }
      return false;
  }
  isSpaced(combination: number[]): boolean {
      const coords = combination.map(n => DataLotto49Advanced.NUMBER_COORDS[n]);
      for (let i = 0; i < coords.length; i++) {
          for (let j = i + 1; j < coords.length; j++) {
              if (Math.abs(coords[i].col - coords[j].col) <= 1 && Math.abs(coords[i].row - coords[j].row) <= 1) {
                  return false; // Números adyacentes encontrados
              }
          }
      }
      return true;
  }
  isLine(coords: {row: number, col: number}[]): boolean {
      const allSameRow = coords.every(c => c.row === coords[0].row);
      const allSameCol = coords.every(c => c.col === coords[0].col);
      return allSameRow || allSameCol;
  }
  isDiagonal(coords: {row: number, col: number}[]): boolean {
      const mainDiagValue = coords[0].row - coords[0].col;
      if (coords.every(c => c.row - c.col === mainDiagValue)) return true;
      const antiDiagValue = coords[0].row + coords[0].col;
      if (coords.every(c => c.row + c.col === antiDiagValue)) return true;
      return false;
  }
  calculateCombinationScore(combination: number[]): number {
      let score = 0;
      combination.forEach(n => {
          if (this.hotNumbers.has(n)) score += 2;
          // Only penalize cold numbers if regression filter is OFF
          if (!this.filters.useRegression && this.coldNumbers.has(n)) score -= 1;
      });

      if (this.filters.geometric.favor.includes('espaciados') && this.isSpaced(combination)) {
          score += 15;
      }
      if (this.filters.useMarkov) {
          score += this.getAIMarkovScore(combination);
      }
      if (this.filters.useNash) {
          score -= this.getAIPopularityPenalty(combination) * this.filters.ai.nashWeight;
      }
      if (this.filters.useRegression) {
          combination.forEach(n => {
              if (this.absentNumbers.has(n)) {
                score += this.filters.ai.regressionBonus * 1.5; // Mayor bonus para ausentes
              } else if (this.coldNumbers.has(n)) {
                score += this.filters.ai.regressionBonus; // Bonus normal para fríos
              }
          });
      }
      return score;
  }
  getAIMarkovScore(combination: number[]): number {
      if (this.historicalData.length < this.filters.ai.markovDepth) return 0;
      let score = 0;
      const lastDraws = this.historicalData.slice(-this.filters.ai.markovDepth).flatMap(d => d.numbers);
      const lastDrawsSet = new Set(lastDraws);
      combination.forEach(n => {
          if (lastDrawsSet.has(n)) score += lastDraws.filter(d => d === n).length;
      });
      return score;
  }
  getAIPopularityPenalty(combination: number[]): number {
      let penalty = 0;
      combination.forEach(n => {
          if (n <= 31) penalty += 2; // Penalize numbers in the "date range"
          const { row, col } = DataLotto49Advanced.NUMBER_COORDS[n];
          if (row === 0 || row === 6 || col === 0 || col === 6) penalty += 1; // Penalize edge numbers
      });
      if (this.isLine(combination.map(n => DataLotto49Advanced.NUMBER_COORDS[n]))) penalty += 10;
      return penalty;
  }
  showLoading(text: string) { 
    const loadingText = document.getElementById('loadingText');
    if (loadingText) loadingText.textContent = text;
    const loadingInfo = document.getElementById('loadingInfo');
    if (loadingInfo) loadingInfo.textContent = 'Iniciando...';
    const loadingModal = document.getElementById('loadingModal') as HTMLElement;
    if (loadingModal) loadingModal.style.display = 'flex'; 
  }
  hideLoading() { 
    const loadingModal = document.getElementById('loadingModal') as HTMLElement;
    if (loadingModal) loadingModal.style.display = 'none';
  }
  showFilterSpinner() {
    const overlay = document.getElementById('filterSpinnerOverlay');
    if (overlay) overlay.classList.add('show');
  }
  hideFilterSpinner() {
    const overlay = document.getElementById('filterSpinnerOverlay');
    if (overlay) overlay.classList.remove('show');
  }
  showToast(message: string, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => { toast.className = 'toast'; }, 3000);
  }
  toggleModal(id: string, show: boolean) { 
    const modal = document.getElementById(id) as HTMLElement;
    if (modal) modal.style.display = show ? 'flex' : 'none';
  }
  toggleCollapse(targetId: string) {
    const content = document.getElementById(`${targetId}Content`);
    const btn = document.getElementById(`${targetId}CollapseBtn`);
    if (content && btn) {
        content.classList.toggle('expanded');
        btn.textContent = content.classList.contains('expanded') ? '-' : '+';
    }
  }

  // ===== NEW FEATURES =====

  renderFrequencyChart() {
    const container = document.getElementById('frequencyChartContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!this.dataLoaded || this.historicalData.length === 0) {
        container.innerHTML = '<div style="color:#666; text-align: center; width: 100%;">Carga datos para ver el gráfico.</div>';
        return;
    }

    const frequencies: { [key: number]: number } = {};
    for (let i = 1; i <= 49; i++) frequencies[i] = 0;
    this.historicalData.forEach(draw => draw.numbers.forEach(num => frequencies[num]++));
    
    const maxFreq = Math.max(...Object.values(frequencies));
    if (maxFreq === 0) return;

    for (let i = 1; i <= 49; i++) {
        const freq = frequencies[i];
        const barHeight = (freq / maxFreq) * 100;
        
        const barWrapper = document.createElement('div');
        barWrapper.className = 'bar-wrapper';
        barWrapper.title = `Número ${i}: ${freq} apariciones`;
        
        barWrapper.innerHTML = `
            <div class="bar-value">${freq}</div>
            <div class="chart-bar" style="height: ${barHeight}%"></div>
            <div class="bar-label">${i}</div>
        `;
        container.appendChild(barWrapper);
    }
  }
  
  startTutorial() {
    this.currentTutorialStep = 0;
    this.showTutorialStep();
    this.toggleModal('tutorialModal', true);
  }

  endTutorial() {
    this.toggleModal('tutorialModal', false);
    localStorage.setItem(DataLotto49Advanced.TUTORIAL_KEY, 'true');
    
    document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
  }

  nextTutorialStep() {
    if (this.currentTutorialStep < this.tutorialSteps.length - 1) {
        this.currentTutorialStep++;
        this.showTutorialStep();
    } else {
        this.endTutorial();
    }
  }
  
  prevTutorialStep() {
    if (this.currentTutorialStep > 0) {
        this.currentTutorialStep--;
        this.showTutorialStep();
    }
  }
  
  showTutorialStep() {
    const step = this.tutorialSteps[this.currentTutorialStep];
    
    document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
    
    const targetElement = document.querySelector(step.targetElement);
    if (targetElement) {
        targetElement.classList.add('tutorial-highlight');
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    const titleEl = document.getElementById('tutorialTitle');
    const contentEl = document.getElementById('tutorialContent');
    const progressEl = document.getElementById('tutorialProgress');
    const prevBtn = document.getElementById('tutorialPrevBtn') as HTMLButtonElement;
    const nextBtn = document.getElementById('tutorialNextBtn') as HTMLButtonElement;
    
    if (titleEl) titleEl.textContent = step.title;
    if (contentEl) contentEl.innerHTML = step.text;
    if (progressEl) progressEl.textContent = `${this.currentTutorialStep + 1} / ${this.tutorialSteps.length}`;
    
    prevBtn.style.display = this.currentTutorialStep === 0 ? 'none' : 'inline-block';
    nextBtn.textContent = this.currentTutorialStep === this.tutorialSteps.length - 1 ? 'Finalizar' : 'Siguiente';
  }

}

// Global instance of the app
document.addEventListener('DOMContentLoaded', () => {
  new DataLotto49Advanced();
});

// FIX: Add an empty export to treat this file as a module.
export {};