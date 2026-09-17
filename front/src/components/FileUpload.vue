<template>
    <div class="ds-file-upload" :class="{
        'ds-file-upload--dragging': dragging,
        'ds-file-upload--error': effectiveError,
        'ds-file-upload--disabled': disabled,
    }">
        <label :id="`${id}-label`" class="ds-file-upload__label" :for="id">
            {{ label }}
            <span v-if="required" aria-hidden="true">*</span>
            <small v-if="optional">선택</small>
        </label>

        <div class="ds-file-upload__dropzone" role="group" :aria-labelledby="`${id}-label`"
            :aria-describedby="describedBy" @click="openFileDialog" @dragenter.prevent="startDragging"
            @dragover.prevent="startDragging" @dragleave.prevent="stopDragging" @drop.prevent="handleDrop">
            <input :id="id" ref="fileInput" class="ds-file-upload__input" type="file" :accept="accept || null"
                :multiple="multiple" :required="required && files.length === 0" :disabled="disabled"
                :aria-invalid="effectiveError ? 'true' : 'false'" :aria-describedby="describedBy" @click.stop
                @change="handleFileChange" />

            <div class="ds-file-upload__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"></path>
                    <path d="M5 14v3.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V14"></path>
                </svg>
            </div>

            <p v-if="dropzoneLabel" class="ds-file-upload__dropzone-label">{{ dropzoneLabel }}</p>
            <div v-else class="ds-file-upload__copy">
                <p>파일을 드래그해 놓거나</p>
                <button type="button" :disabled="disabled" @click.stop="openFileDialog">파일 선택</button>
            </div>
            <p :id="`${id}-help`" class="ds-file-upload__help">{{ helpText }}</p>
        </div>

        <ul v-if="files.length" class="ds-file-upload__files" aria-label="선택한 파일">
            <li v-for="(file, index) in files" :key="fileKey(file, index)">
                <span class="ds-file-upload__file-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M7 3.5h6.5L18 8v12.5H7V3.5Z"></path>
                        <path d="M13.5 3.5V8H18"></path>
                    </svg>
                </span>
                <span class="ds-file-upload__file-copy">
                    <strong>{{ fileName(file) }}</strong>
                    <small>{{ formatFileSize(file.size) }}</small>
                </span>
                <button type="button" :disabled="disabled" :aria-label="`${fileName(file)} 제거`"
                    @click="removeFile(index)">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="m6 6 12 12M18 6 6 18"></path>
                    </svg>
                </button>
            </li>
        </ul>

        <p v-if="effectiveError" :id="`${id}-error`" class="ds-file-upload__error" role="alert">
            {{ effectiveError }}
        </p>
    </div>
</template>

<script>
export default {
    name: "DsFileUpload",
    props: {
        id: {
            type: String,
            required: true,
        },
        value: {
            type: Array,
            default: () => [],
        },
        label: {
            type: String,
            required: true,
        },
        accept: {
            type: String,
            default: "",
        },
        maxSizeMb: {
            type: Number,
            default: 10,
        },
        multiple: {
            type: Boolean,
            default: true,
        },
        help: {
            type: String,
            default: "",
        },
        // 지정하면 기본 "파일을 드래그해 놓거나 / 파일 선택" 대신 한 줄 안내만 노출한다.
        dropzoneLabel: {
            type: String,
            default: "",
        },
        error: {
            type: String,
            default: "",
        },
        required: {
            type: Boolean,
            default: false,
        },
        optional: {
            type: Boolean,
            default: false,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    data() {
        return {
            dragging: false,
            validationError: "",
        }
    },
    computed: {
        files() {
            return Array.isArray(this.value) ? this.value : []
        },
        effectiveError() {
            return this.error || this.validationError
        },
        describedBy() {
            return this.effectiveError ? `${this.id}-help ${this.id}-error` : `${this.id}-help`
        },
        helpText() {
            if (this.help) return this.help

            const acceptedTypes = this.accept
                ? this.accept
                    .split(",")
                    .map((type) => type.trim().replace(".", "").toUpperCase())
                    .filter(Boolean)
                    .join(", ")
                : "모든 파일"

            return `${acceptedTypes} · 파일당 최대 ${this.maxSizeMb}MB`
        },
    },
    methods: {
        openFileDialog() {
            if (!this.disabled && this.$refs.fileInput) {
                this.$refs.fileInput.click()
            }
        },
        startDragging() {
            if (!this.disabled) this.dragging = true
        },
        stopDragging() {
            this.dragging = false
        },
        handleDrop(event) {
            this.dragging = false
            if (this.disabled) return
            this.addFiles(event.dataTransfer ? event.dataTransfer.files : [])
        },
        handleFileChange(event) {
            this.addFiles(event.target.files || [])
            event.target.value = ""
        },
        addFiles(fileList) {
            const incomingFiles = Array.from(fileList || [])
            const acceptedFiles = []
            const invalidFiles = []

            incomingFiles.forEach((file) => {
                const reasons = []

                if (!this.isAcceptedType(file)) reasons.push("허용되지 않은 형식")
                if (Number(file.size || 0) > this.maxSizeMb * 1024 * 1024) reasons.push(`${this.maxSizeMb}MB 초과`)

                if (reasons.length) {
                    invalidFiles.push(`${this.fileName(file)} (${reasons.join(", ")})`)
                } else {
                    acceptedFiles.push(file)
                }
            })

            this.validationError = invalidFiles.length ? `추가할 수 없는 파일: ${invalidFiles.join(", ")}` : ""

            if (invalidFiles.length) {
                this.$emit("invalid", this.validationError)
            }

            if (acceptedFiles.length) {
                const nextFiles = this.multiple ? [...this.files, ...acceptedFiles] : [acceptedFiles[0]]
                this.$emit("input", nextFiles)
                this.$emit("change", nextFiles)
            }
        },
        isAcceptedType(file) {
            if (!this.accept) return true

            const fileName = this.fileName(file).toLowerCase()
            const mimeType = String(file.type || "").toLowerCase()

            return this.accept
                .split(",")
                .map((type) => type.trim().toLowerCase())
                .filter(Boolean)
                .some((type) => {
                    if (type.startsWith(".")) return fileName.endsWith(type)
                    if (type.endsWith("/*")) return mimeType.startsWith(type.slice(0, -1))
                    return mimeType === type
                })
        },
        removeFile(index) {
            const removedFile = this.files[index]
            const nextFiles = this.files.filter((file, fileIndex) => fileIndex !== index)
            this.validationError = ""
            this.$emit("input", nextFiles)
            this.$emit("change", nextFiles)
            this.$emit("remove", removedFile)
        },
        fileName(file) {
            return file.originalname || file.name || "이름 없는 파일"
        },
        fileKey(file, index) {
            return `${this.fileName(file)}-${file.size || 0}-${index}`
        },
        formatFileSize(bytes) {
            const size = Number(bytes || 0)
            if (!size) return "0 Bytes"
            if (size < 1024) return `${size} Bytes`
            if (size < 1024 * 1024) return `${Math.round((size / 1024) * 10) / 10} KB`
            return `${Math.round((size / (1024 * 1024)) * 10) / 10} MB`
        },
    },
}
</script>

<style scoped lang="less">
.ds-file-upload {
    display: grid;
    gap: @spacing-sm;
    min-width: 0;
}

.ds-file-upload__label {
    display: flex;
    align-items: center;
    gap: @spacing-xs;
    color: @text-body;
    font-size: @font-size-sm;
    font-weight: @font-weight-bold;

    >span {
        color: @danger-color;
    }

    >small {
        color: @text-muted;
        font-size: @font-size-xs;
        font-weight: @font-weight-medium;
    }
}

.ds-file-upload__dropzone {
    display: grid;
    min-height: 196px;
    place-items: center;
    align-content: center;
    gap: @spacing-md;
    padding: @spacing-2xl;
    border: 1px dashed @border-dark;
    border-radius: @field-border-radius;
    background: @background-white;
    cursor: pointer;
    text-align: center;
    transition: @transition-fast;
    box-sizing: border-box;

    &:hover {
        border-color: @primary-color;
        background: fade(@primary-light, 42%);
    }
}

.ds-file-upload--dragging .ds-file-upload__dropzone {
    border-color: @primary-color;
    background: @primary-light;
    box-shadow: @focus-ring;
}

.ds-file-upload__input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
}

.ds-file-upload__icon {
    display: grid;
    width: 48px;
    height: 48px;
    place-items: center;
    border-radius: @border-radius-full;
    background: @primary-light;
    color: @primary-color;

    svg {
        width: 24px;
        height: 24px;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.8;
    }
}

.ds-file-upload__dropzone-label {
    margin: 0;
    color: @text-dark;
    font-size: @font-size-sm;
    font-weight: @font-weight-bold;
    text-align: center;
}

.ds-file-upload__copy {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: @spacing-xs;

    p {
        margin: 0;
        color: @text-light;
        font-size: @font-size-sm;
    }

    button {
        padding: 0;
        border: 0;
        background: transparent;
        color: @primary-color;
        cursor: pointer;
        font: inherit;
        font-size: @font-size-sm;
        font-weight: @font-weight-bold;

        &:hover:not(:disabled) {
            color: @primary-dark;
            text-decoration: underline;
        }

        &:focus-visible {
            outline: 3px solid fade(@primary-color, 20%);
            outline-offset: 3px;
            border-radius: @border-radius-sm;
        }
    }
}

.ds-file-upload__help,
.ds-file-upload__error {
    margin: 0;
    font-size: @font-size-xs;
    line-height: @line-height-normal;
}

.ds-file-upload__help {
    color: @text-muted;
}

.ds-file-upload__error {
    color: @danger-color;
    font-weight: @font-weight-semibold;
}

.ds-file-upload__files {
    display: grid;
    gap: @spacing-sm;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
        display: grid;
        grid-template-columns: 36px minmax(0, 1fr) 36px;
        gap: @spacing-md;
        align-items: center;
        min-height: 60px;
        padding: @spacing-sm @spacing-md;
        border: 1px solid @border-color;
        border-radius: @border-radius-md;
        background: @background-white;
        box-sizing: border-box;

        >button {
            display: grid;
            width: 36px;
            height: 36px;
            padding: 0;
            place-items: center;
            border: 0;
            border-radius: @border-radius-md;
            background: transparent;
            color: @text-muted;
            cursor: pointer;

            &:hover:not(:disabled),
            &:focus-visible {
                outline: none;
                background: @danger-light;
                color: @danger-color;
            }

            svg {
                width: 18px;
                height: 18px;
                stroke: currentColor;
                stroke-linecap: round;
                stroke-width: 1.8;
            }
        }
    }
}

.ds-file-upload__file-icon {
    display: grid;
    width: 36px;
    height: 36px;
    place-items: center;
    border-radius: @border-radius-md;
    background: @primary-light;
    color: @primary-color;

    svg {
        width: 20px;
        height: 20px;
        stroke: currentColor;
        stroke-linejoin: round;
        stroke-width: 1.6;
    }
}

.ds-file-upload__file-copy {
    display: grid;
    gap: 2px;
    min-width: 0;

    strong {
        overflow: hidden;
        color: @text-body;
        font-size: @font-size-sm;
        font-weight: @font-weight-semibold;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    small {
        color: @text-muted;
        font-size: @font-size-xs;
    }
}

.ds-file-upload--error .ds-file-upload__dropzone {
    border-color: @danger-color;
}

.ds-file-upload--disabled {
    opacity: 0.58;

    .ds-file-upload__dropzone,
    button {
        cursor: not-allowed;
    }
}
</style>