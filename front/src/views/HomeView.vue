<template>
  <div>
    <v-text-field v-model="year" label="연도"></v-text-field>
    <v-text-field v-model="month" label="월"></v-text-field>
    <v-text-field v-model="date" label="일"></v-text-field>
    {{ year }}-{{ month }}-{{ date }}
    <div class="text-center">
      <v-btn color="primary" @click="check">운세확인</v-btn>
    </div>

    <div class="result" v-if="result.money && result.love">
      <div class="money">
        <h1>재물운</h1>
        {{ result.money }}
      </div>
      <div class="love">
        <h1>애정운</h1>
        {{ result.love }}
      </div>
    </div>

  </div>
</template>
<script>
import { defineComponent } from 'vue';
export default defineComponent({
  name: 'HomeView',
  data() {
    return {
      year: "",
      month: "",
      date: "",
      result: {
        money: null,
        love: null
      }
    }
  },
  methods: {
    async check() {
      var response = await this.$axios.post("/fortune/check", {
        birth: `${this.year}-${this.month}-${this.date}`
      })
      this.result = response.data
    }
  }
});
</script>
