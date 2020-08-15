Vue.component('v-select', VueSelect.VueSelect);

const ChartDefinition = [
  {
    title: "Bar",
    multiSeries: true,
    hasYAxis: true,
    stackable: true,
  },
  {
    title: "Line",
    multiSeries: true,
    hasYAxis: true,
    curve: true,
    fill: true
  },
  {
    title: "Doughnut"
  },
  {
    title: "Pie"
  }
]

var app = new Vue({
  el: '#app',
  data() {
    return {
      completed: false, // Whether csv file is selected
      raw: [], // Raw csv data parsed by papaparse
      header: [], // First row of the raw csv data as series name
      
      selected: [], // Selected data series
      chartType: "Bar", // Selected chart type
      
      chart: {}, // Active chart object (kept for destruction after updating chart types or options)

      // Valid chart options objects
      chartDefinition: ChartDefinition, // Valid chart options for each chart type
      activeChartDefinition: {}, // Valid chart options available for the selected chart type. Updated by updateChartType()

      // Variables storing chart options
      chartOption_beginAtZero: true, // valid for chart with hasYAxis. Specifies whether y-axis of chart must include 0
      chartOption_curve: true, // valid for chart with curve. Specifies whether or not to smooth the curve
      chartOption_fill: false, // valid for chart with fill. Specifies whether area under curve should be filled
      chartOption_stack: false // valid for chart with stackable. Specifies whether series should be stacked
    }
  },
  methods: {
    /**
     * Loads and parses csv file.
     */
    load() {
      this.completed = false;
      this.raw = {};
      
      const selectedFile = document.getElementById('myfile').files[0];
      console.log(selectedFile.name);
      Papa.parse(selectedFile, {
        complete: (results) => {
          console.log("Finished:", results.data);
          this.raw = results.data;
          this.header = Array.from(this.raw[0]); // problem: duplicated / null headers
          this.header.shift();
          this.completed = true;
          console.log(this.completed);
        }
      });
    },

    /**
     * Renders chart.
     */
    render() {
      console.log("Trying to render!");
      let transformed = this.transform();

      let datasets = [];
      transformed.series.map( (series) => {
        datasets.push({
          label: series.seriesName,
          lineTension: (!this.chartOption_curve) ? 0 : 0.4,
          fill: this.chartOption_fill,
          data: series.data
        })
      });
      
      // Graph!!
      let ctx = document.getElementById('csv-chart').getContext('2d');
      
      if (this.chart instanceof Chart) this.chart.destroy();

      this.chart = new Chart(ctx, {
        type: this.chartType.toLowerCase(),
        
        data: {
          labels: transformed.xaxis,
          datasets: datasets
        },
        
        options: { // Should check whether options are valid before using
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
      });
      
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
       * Each element of an array is an object: { seriesName: "SERIES NAME", data: [ numbers of the series ] }
       */
      let seriesIndex = [];
      if (Array.isArray(this.selected))
        this.selected.map( (seriesName) => seriesIndex.push(this.header.indexOf(seriesName) + 1));
        // +1? this.header has the first element stripped. As we will use this index to retrieve the data in this.raw, we need to add back 1.
      else
        seriesIndex.push(this.header.indexOf(this.selected) + 1);

      seriesIndex.map ( (seriesI) => {
        series.push({ seriesName: this.header[seriesI - 1], data: [] }); // -1 to retrieve series name from this.header
        for (row of this.raw) 
          series[series.length - 1].data.push(row[seriesI]);
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
    },

    /**
     * Updates the chart options available for the specified chart type.
     * 
     * @param {initialized} doRender Whether or not chart should be rendered after updating chart options.
     * Should be true when chart options are updated by user so that changes can be previewed immediately.
     * Should be false during initialization of page when data series are not yet ready.
     */
    updateChartType(doRender = true) {
      chartType = this.chartType;
      this.activeChartDefinition = this.chartDefinition.find( chart => chart.title === chartType);
      console.log(this.activeChartDefinition.title);

      if (doRender)
        this.render();
    }
    
  },
  mounted() {
    this.updateChartType(false);
  }
})