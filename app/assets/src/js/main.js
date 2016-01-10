/* global $, EXIF */
class Main {
    constructor(canvas, loading, response) {
        this.canvas = canvas;
        this.loading = loading;
        this.response = response;
        this.size = Math.min($(window).width() - 30, 512);
        this.canvas.width = this.canvas.height = this.size;
        $(this.loading)
            .width(this.size + 1)
            .height(this.size + 1);
        $(this.loading).children().first().css({
            top: (this.size - 200) / 2.0,
            left: (this.size - 200) / 2.0
        });
        this.ctx = canvas.getContext('2d');
        this.ctx.fillStyle = '#000';

        // drag and drop
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        this.canvas.addEventListener('drop', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) {
                this.readFile(e.dataTransfer.files[0]);
            }
        });
    }
    onImageLoad() {
        // draw to canvas
        const h = this.image.height;
        const w = this.image.width;
        this.scale = Math.max(w / this.size, h / this.size);
        this.offset_x = (this.size - w / this.scale) / 2.0;
        this.offset_y = (this.size - h / this.scale) / 2.0;
        this.ctx.fillRect(0, 0, this.size, this.size);
        // rotate image
        EXIF.getData(this.image, () => {
            const transforms = {
                1: [1, 0, 0, 1, 0, 0],
                2: [-1, 0, 0, 1, this.size, 0],
                3: [-1, 0, 0, -1, this.size, this.size],
                4: [1, 0, 0, -1, 0, this.size],
                5: [0, 1, 1, 0, 0, 0],
                6: [0, 1, -1, 0, this.size, 0],
                7: [0, -1, -1, 0, this.size, this.size],
                8: [0, -1, 1, 0, 0, this.size]
            };
            const orientation = EXIF.getTag(this.image, 'Orientation');
            this.ctx.transform(...transforms[orientation || 1]);
            this.ctx.drawImage(this.image, this.offset_x, this.offset_y, w / this.scale, h / this.scale);
            this.ctx.setTransform(...transforms[1]);
            if ((orientation || 1) > 4) {
                [this.offset_x, this.offset_y] = [this.offset_y, this.offset_x];
            }
        });
        // post to api
        const key = this.key = Math.floor(Math.random() * 0xFFFFFFFF).toString(16);
        $(this.response).text('');
        $(this.loading).show();
        $.ajax({
            url: '/api',
            method: 'POST',
            data: {
                image: this.image.src
            },
            success: (result) => {
                if (this.key !== key) {
                    return;
                }
                $(this.loading).hide();
                $(this.response).text(JSON.stringify(result, null, '  '));
                this.drawFaceRect(result.faces);
            }
        });
    }
    enableSelectFile(file) {
        file.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.readFile(e.target.files[0]);
            }
        });
    }
    readFile(file) {
        const reader = new window.FileReader();
        reader.onload = (e) => {
            // load image
            this.image = new window.Image();
            this.image.onload = this.onImageLoad.bind(this);
            this.image.onerror = () => {
                this.ctx.fillRect(0, 0, this.size, this.size);
                alert('Failed to load image.');
            };
            this.image.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    drawFaceRect(faces) {
        const rotate = (target, center, rad) => {
            return {
                x:   Math.cos(rad) * target.x + Math.sin(rad) * target.y - center.x * Math.cos(rad) - center.y * Math.sin(rad) + center.x,
                y: - Math.sin(rad) * target.x + Math.cos(rad) * target.y + center.x * Math.sin(rad) - center.y * Math.cos(rad) + center.y
            };
        };
        faces.forEach((face) => {
            const v = face.bounding.map((e) => {
                return {
                    x: e.x / this.scale + this.offset_x,
                    y: e.y / this.scale + this.offset_y
                };
            });
            const center = {
                x: (v[0].x + v[2].x) / 2.0,
                y: (v[0].y + v[2].y) / 2.0
            };
            const radian = face.angle.roll * Math.PI / 180.0;
            const p = v.map((e) => rotate(e, center, -radian));
            this.ctx.beginPath();
            this.ctx.moveTo(p[0].x, p[0].y);
            this.ctx.lineTo(p[1].x, p[1].y);
            this.ctx.lineTo(p[2].x, p[2].y);
            this.ctx.lineTo(p[3].x, p[3].y);
            this.ctx.closePath();
            this.ctx.stroke();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const main = new Main(
        document.getElementById('canvas'),
        document.getElementById('loading'),
        document.getElementById('response')
    );
    main.enableSelectFile(document.getElementById('file'));
});
