<template>
    <v-container>
        <v-textarea v-model="description" placeholder="만들고 싶은 이미지의 설명을 작성해보세요"></v-textarea>
    </v-container>
    <div class="text-center">
        <v-btn :disabled="loading" color="primary" @click="submit">
            <span v-if="!loading">생성</span>
            <span v-if="loading">생성중..</span>
        </v-btn>
    </div>
    <div class="text-center mt-5" v-if="imageUrl">
        <img :src="imageUrl" alt="">
        <v-textarea v-model="modifyDescription" placeholder="수정할 부분을 작성해주세요"></v-textarea>
        <v-btn :disabled="loading" color="primary" @click="modifySubmit">
            <span v-if="!loading">수정하기</span>
            <span v-if="loading">수정중..</span>
        </v-btn>
    </div>

</template>
<script>
export default {

    data() {
        return {
            loading: false,
            description: "",
            imageUrl: null,
            id: null,
            modifyDescription: ""
        }
    },
    methods: {
        async submit() {
            if (this.description == "") {
                return
            }
            this.loading = true     //로딩중으로 상태 변경
            //생성 완료시
            var result = await this.$axios.post("/image/create", {
                description: this.description
            })
            this.loading = false  //로딩 종료
            if (result.data.success) {    //생성 성공시
                this.imageUrl = result.data.image
                this.id = result.data.id    //이미지 id 저장하기
            }
        },
        async modifySubmit() {    //수정 요청하기
            if (this.modifyDescription == "") {
                return
            }
            this.loading = true   //로딩중으로 변경
            var result = await this.$axios.post("/image/modify", {
                id: this.id,
                description: this.modifyDescription
            })
            this.loading = false    //로딩 종료
            if (result.data.success) {    //수정 성공시
                this.imageUrl = result.data.image
                this.id = result.data.id
            }

        }
    }
}
</script>
<style scoped lang="less">
img {
    width: 800px;
    height: auto;
}
</style>