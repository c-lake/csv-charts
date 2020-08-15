const ChartDefinition = [
  {
    title: "Bar",
    multiSeries: true,
    hasYAxis: true
  },
  {
    title: "Line",
    multiSeries: true,
    hasYAxis: true,
    curve: true
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
      
      selected: "", // Selected data series
      chartType: "Bar", // Selected chart type
      
      chart: {}, // Active chart object (kept for destruction after updating chart types or options)

      // Valid chart options objects
      chartDefinition: ChartDefinition, // Valid chart options for each chart type
      activeChartDefinition: {}, // Valid chart options available for the selected chart type. Updated by updateChartType()

      // Variables storing chart options
      chartOption_beginAtZero: true,
      chartOption_curve: true
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
          this.header = this.raw[0]; // problem: duplicated / null headers
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
      
      // Graph!!
      let ctx = document.getElementById('csv-chart').getContext('2d');
      
      if (this.chart instanceof Chart) this.chart.destroy();

      this.chart = new Chart(ctx, {
        type: this.chartType.toLowerCase(),
        
        data: {
          labels: transformed.xaxis,
          datasets: [{
            label: this.selected,
            lineTension: (!this.chartOption_curve) ? 0 : 0.4,
            data: transformed.series
          }]
        },
        
        options: {
          scales: (this.activeChartDefinition.hasYAxis) ? {
            yAxes: [{
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
      let seriesIndex = this.header.indexOf(this.selected);
      for (row of this.raw) {
        series.push(row[seriesIndex]);
      }
      series.shift();
      console.log(`Data series: ${series}`);
      
      return { xaxis, series };
    },

    /**
     * Transposes csv table.
     */
    transpose() {
      this.raw = this.raw[0].map((x,i) => this.raw.map(x => x[i]));
      this.header = this.raw[0]; // problem: duplicated / null headers
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