Vue.component('v-select', VueSelect.VueSelect);

const ChartDefinition = [
  {
    title: 'Bar',
    multiSeries: true,
    hasYAxis: true,
    stackable: true,
  },
  {
    title: 'Line',
    multiSeries: true,
    hasYAxis: true,
    curve: true,
    fill: true
  },
  {
    title: 'Doughnut'
  },
  {
    title: 'Pie'
  },
  {
    title: 'Radar',
    multiSeries: true,
    fill: true
  },
  {
    title: 'Scatter',
    multiSeries: true,
    hasYAxis: true,
    scatterTransform: true
  }
]

var app = new Vue({
  el: '#app',
  data() {
    return {
      completed: false, // Whether csv file is selected
      largeFileMode: false, // Large file mode limits the CSV preview size and stop automatic rendering after changing any options
      html: '', // For storing chart configurations when exporting as html
      chartId: 0, // For storing a random number when exporting as html

      raw: [], // Raw csv data parsed by papaparse
      header: [], // First row of the raw csv data as series name
      preview: [], // First 8 cols and 16 rows of the CSV data for preview under large file mode
      
      selected: [], // Selected data series
      chartType: 'Bar', // Selected chart type
      
      chart: {}, // Active chart object (kept for destruction after updating chart types or options)
      
      // Valid chart options objects
      chartDefinition: ChartDefinition, // Valid chart options for each chart type
      activeChartDefinition: {}, // Valid chart options available for the selected chart type. Updated by updateChartType()
      
      // Variables storing chart options
      chartOption_beginAtZero: true, // valid for chart with hasYAxis. Specifies whether y-axis of chart must include 0
      chartOption_curve: true, // valid for chart with curve. Specifies whether or not to smooth the curve
      chartOption_fill: false, // valid for chart with fill. Specifies whether area under curve should be filled
      chartOption_stack: false, // valid for chart with stackable. Specifies whether series should be stacked
      chartOption_chartTitle: false, // valid for all chart types. Specifies whether chart title should be displayed
      chartOption_chartTitleText: '' // valid for all chart types. Specifies the chart title text
    }
  },
  methods: {
    /**
     * Loads and parses csv file.
     */
    load() {
      this.completed = false;

      // Resets variables on load
      this.raw = [];
      this.header = [];
      this.selected = [];
      if (this.chart instanceof Chart) this.chart.destroy();
      
      const selectedFile = document.getElementById('myfile').files[0];
      console.log(selectedFile.name);
      Papa.parse(selectedFile, {
        skipEmptyLines: true,
        complete: (results) => {
          console.log('Finished:', results.data);
          this.raw = results.data;
          this.header = Array.from(this.raw[0]); // problem: duplicated / null headers
          this.header.shift();
          this.refreshPreview();
          this.completed = true;
          console.log(this.completed);
        }
      });
    },
    
    /**
     * Renders chart.
     * 
     * @param {Boolean} force Whether or not to run a manual render in large file mode. Defaults to false.
     * This option has no effect if large file mode is not activated.
     * @param {Boolean} refreshHtml Whether or not to refresh the exportable HTML. Defaults to false.
     */
    render(force = false, refreshHtml = false) {
      if (!this.completed) return; // Do nothing if file not loaded
      if (this.largeFileMode && !force) return;

      console.log('Trying to render!');
      let transformed = this.transform();
      
      let datasets = [];
      transformed.series.map( (series) => {
        datasets.push({
          label: series.seriesName,
          lineTension: (this.activeChartDefinition.curve && this.chartOption_curve) ? 0.4 : 0,
          fill: this.chartOption_fill,
          data: series.data
        })
      });

      // Graph!!
      let ctx = document.getElementById('csv-chart').getContext('2d');
      
      if (this.chart instanceof Chart) this.chart.destroy();
      
      let chartConfig = {
      type: this.chartType.toLowerCase(),
      
      data: {
        labels: transformed.xaxis,
        datasets: datasets
      },
      
      options: { // Should check whether options are valid before using
        title: {
          display: this.chartOption_chartTitle,
          fontSize: 16,
          text: this.chartOption_chartTitleText
        },
        scales: (this.activeChartDefinition.hasYAxis) ? {
          xAxes: [{
            stacked: this.activeChartDefinition.stackable && this.chartOption_stack
          }],
          yAxes: [{
            stacked: this.activeChartDefinition.stackable && this.chartOption_stack,
            ticks: {
              beginAtZero: this.chartOption_beginAtZero
            }
          }]
        } : null,
        plugins: {
          colorschemes: {
            scheme: 'tableau.Classic20'
          }
        }
      }
    }

    if (refreshHtml) {
      this.chartId = Math.floor(Math.random() * 10000);
      this.html = JSON.stringify(chartConfig);
    }
    this.chart = new Chart(ctx, chartConfig);
      
    },
    
    /**
     * Prepares selected data series for render.
     */
    transform() {
      let xaxis = [];
      const xaxisIndex = 0;
      for (row of this.raw) {
        xaxis.push(row[xaxisIndex]);
      }
      xaxis.shift();
      console.log(`Horizontal axis: ${xaxis}`);
      
      let series = [];
      /* series is an array storing the data series to be rendered.
       * Each element of an array is an object: { seriesName: 'SERIES NAME', data: [ numbers of the series ] }
       */
      let seriesIndex = [];
      
      // Find indices from series name, store them into seriesIndex[]
      if (Array.isArray(this.selected))
        this.selected.map( (seriesName) => seriesIndex.push(this.header.indexOf(seriesName) + 1));
        // +1? this.header has the first element stripped. As we will use this index to retrieve the data in this.raw, we need to add back 1.
      else
        seriesIndex.push(this.header.indexOf(this.selected) + 1);
      
      // Extract data from raw, store them into series[]
      seriesIndex.map ( (seriesI) => {
        series.push({ seriesName: this.header[seriesI - 1], data: [] }); // -1 to retrieve series name from this.header
        if (!this.activeChartDefinition.scatterTransform) {
          // Extract data for general charts
          this.raw.map( (row) => {
            series[series.length - 1].data.push(row[seriesI]);
          })
        }
        else {
          // Extract data for scatter charts
          this.raw.map( (row, i) => {
            series[series.length - 1].data.push({ x: xaxis[i - 1], y: row[seriesI] })
          })
        }
        series[series.length - 1].data.shift();
      } );
      
      console.log(series);
      
      return { xaxis, series };
    },
    
    /**
     * Transposes csv table.
     */
    transpose() {
      this.raw = this.raw[0].map((x,i) => this.raw.map(x => x[i]));
      this.header = Array.from(this.raw[0]); // problem: duplicated / null headers
      this.header.shift();
      this.selected = [];
      this.refreshPreview();
    },
    
    /**
     * Updates the chart options available for the specified chart type.
     * 
     * @param {Boolean} doRender Whether or not chart should be rendered after updating chart options.
     * Should be true when chart options are updated by user so that changes can be previewed immediately.
     * Should be false during initialization of page when data series are not yet ready.
     */
    updateChartType(doRender = true) {
      chartType = this.chartType;
      this.activeChartDefinition = this.chartDefinition.find( chart => chart.title === chartType);
      console.log(this.activeChartDefinition.title);
      
      if (doRender)
        this.render();
    },
    
    /**
     * Extracts the first 8 cols and 16 rows of the raw csv data for preview under large file mode.
     * Should be called after data has changed
     */
    refreshPreview() {
      this.preview = this.raw.slice(0, 16).map(row => row.slice(0, 8));
      console.log(this.preview);
    }

  },
  mounted() {
    this.updateChartType(false);
  }
})

function saveImage() {
  let canvas = document.getElementById("csv-chart");
  let image = canvas.toDataURL(`image/png`).replace(`image/png`, "image/octet-stream");
  window.location.href = image;
}