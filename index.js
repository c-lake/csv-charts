"use strict";
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
      fileName: '', // For storing to file name to be displayed in heading
      rendered: false, // Whether chart has been rendered

      raw: [], // Raw csv data parsed by papaparse
      header: [], // First row of the raw csv data as series name
      preview: [], // First 8 cols and 16 rows of the CSV data for preview under large file mode
      fileReadRange: '', // Limit range to read from A1:???
      
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
      chartOption_chartTitleText: '', // valid for all chart types. Specifies the chart title text
      chartOption_yAxisLabel: false, // valid for chart with hasYAxis. Specifies whether y-axis label should be displayed
      chartOption_yAxisLabelText: '', // valid for chart with hasYAxis. Specifies the y-axis label text
      chartOption_xAxisLabel: false, // valid for chart with hasYAxis. Specifies whether x-axis label should be displayed
      chartOption_xAxisLabelText: '', // valid for chart with hasYAxis. Specifies the x-axis label text

      // Zoom options
      zoomX: false,
      zoomY: false,
    }
  },
  methods: {
    /**
     * Loads and parses csv file.
     */
    load() {
      this.completed = false;
      this.rendered = false;

      // Resets variables on load
      this.raw = [];
      this.header = [];
      this.selected = [];
      if (this.chart instanceof Chart) this.chart.destroy();

      let readRange = {};
      if (this.fileReadRange != null) readRange = this.getNumColsFromA1(this.fileReadRange);
      console.log(`Will read ${ readRange.numCols > 0 ? 'first ' + readRange.numCols : 'all'} columns and ${ readRange.numRows > 0 ? 'first ' + readRange.numRows : 'all'} rows.`);
      this.fileReadRange = readRange.col + (readRange.numRows > 0 ? readRange.numRows : '');
      
      const selectedFile = document.getElementById('myfile').files[0];
      console.log(selectedFile.name);
      this.fileName = selectedFile.name;
      Papa.parse(selectedFile, {
        skipEmptyLines: true,
        preview: readRange.numRows > 0 ? readRange.numRows : 0,
        complete: (results) => {
          console.log('Finished:', results.data);
          this.raw = results.data;
          this.limitColumns(readRange.numCols > 0 ? readRange.numCols : 0);
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
      this.registerTooltips();

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

      this.rendered = true;

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
            scaleLabel: {
              display: this.chartOption_xAxisLabel,
              labelString: this.chartOption_xAxisLabelText
            },
            stacked: this.activeChartDefinition.stackable && this.chartOption_stack
          }],
          yAxes: [{
            scaleLabel: {
              display: this.chartOption_yAxisLabel,
              labelString: this.chartOption_yAxisLabelText
            },
            stacked: this.activeChartDefinition.stackable && this.chartOption_stack,
            ticks: {
              beginAtZero: this.chartOption_beginAtZero
            }
          }]
        } : null,
        plugins: {
          colorschemes: {
            scheme: 'tableau.Classic20'
          },
          zoom: {
            pan: {
              enabled: (this.activeChartDefinition.hasYAxis && (this.zoomX || this.zoomY)),
              mode: '' + (this.zoomX ? 'x' : '') + (this.zoomY ? 'y' : '')
            },
            zoom: {
              enabled: (this.activeChartDefinition.hasYAxis && (this.zoomX || this.zoomY)),
              mode: '' + (this.zoomX ? 'x' : '') + (this.zoomY ? 'y' : '')
            }
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
      for (let row of this.raw) {
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
      if (!this.completed) return;
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
      let chartType = this.chartType;
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
    },

    /**
     * Removes excess columns from the raw csv data.
     * Note: Unlike the more efficient row limit provided by PapaParse which does not load excess rows, we need to load all columns before removal.
     * 
     * @param {Number} numCols First numCols columns will be kept.
     */
    limitColumns(numCols) {
      if (numCols <= 0) return;
      this.raw = this.raw.map(row => row.slice(0, numCols));
    },

    /**
     * Returns the number of rows and columns from A1 to the target address.
     * 
     * @param {String} cellAddress Target address for calculation
     */
    getNumColsFromA1(cellAddress) {
      let col = "";
      for (const c of cellAddress) {
        if (c.toUpperCase().charCodeAt(0) >= 65 && c.toUpperCase().charCodeAt(0) <= 90)
          col += c.toUpperCase();
        else
          break;
      }
      let numCols = 0;
      for (let i = 0, j = col.length - 1; i < col.length; i++, j--) {
        numCols += (col.charCodeAt(j) - 64) * (26 ** i);
      }
      let numRows = parseInt(cellAddress.replace(/\D/g,''));
      return {
        col, // The parsed column in alphabets for display
        numCols: numCols > 0 ? numCols : 0,
        numRows: numRows > 0 ? numRows : 0
      }
    },

    registerTooltips() {
      $(function () {
        $('[data-toggle="tooltip"]').tooltip()
      })
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

function saveJpeg(){
  // Blatantly copied from https://stackoverflow.com/a/44174406. Written by Laereom
  let context = document.getElementById('csv-chart').getContext('2d');
  let canvas = context.canvas;
  //cache height and width        
  let w = canvas.width;
  let h = canvas.height;
  let data;
  //get the current ImageData for the canvas.
  data = context.getImageData(0, 0, w, h);
  //store the current globalCompositeOperation
  let compositeOperation = context.globalCompositeOperation;
  //set to draw behind current content
  context.globalCompositeOperation = "destination-over";
  //set background color
  context.fillStyle = "#ffffff";
  //draw background / rect on entire canvas
  context.fillRect(0,0,w,h);
  //get the image data from the canvas
  let imageData = canvas.toDataURL("image/jpeg");
  //clear the canvas
  context.clearRect (0,0,w,h);
  //restore it with original / cached ImageData
  context.putImageData(data, 0,0);
  //reset the globalCompositeOperation to what it was
  context.globalCompositeOperation = compositeOperation;
  //return the Base64 encoded data url string
  let image = imageData.replace(`image/jpeg`, "image/octet-stream");
  window.location.href = image;
}

$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})
