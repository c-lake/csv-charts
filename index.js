var app = new Vue({
  el: '#app',
  data() {
    return {
      completed: false,
      raw: [],
      header: [],
      selected: "",
      chartType: "Bar",
      chart: {}
    }
  },
  methods: {
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
            data: transformed.series
          }]
        },
        
        options: {
          plugins: {
            colorschemes: {
              scheme: 'tableau.Classic20'
            }
          }
        }
      });
      
    },
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
    transpose() {
      this.raw = this.raw[0].map((x,i) => this.raw.map(x => x[i]));
      this.header = this.raw[0]; // problem: duplicated / null headers
    }
  }
})