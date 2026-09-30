<template>
    <v-container>
        <v-text-field v-model="url" placeholder="뉴스 url 을 넣어주세요"></v-text-field>
        <div class="text-center">
            <v-btn color="primary" @click="submit">요약</v-btn>
        </div>

        <div class="summary">
            {{summary}}
        </div>
    </v-container>
</template>

<script>
export default{
    data(){
        return {
            url:"",
            summary:""
        }
    },
    methods:{
        async submit(){
            var result=await this.$axios.post("/news/summary",{
                url:this.url
            })
            if(result.data.success){    //요약된 뉴스내용 성공적으로 가져왔을경우
                this.summary=result.data.summary
            }

        }
    }
}
</script>
<style scopped>
    .summary{
        margin-top: 20px;
        font-size: 20px;
        background: #f5f5f5;
        padding: 20px;
    }
</style>