/* global $ */
class Main {
    constructor(canvas) {
        this.size = Math.min($(window).width() - 30, 512);
        this.canvas = canvas;
        this.canvas.width = this.canvas.height = this.size;
        this.ctx = canvas.getContext('2d');
        this.ctx.fillStyle = '#000';

        // image load
        this.image = new window.Image();
        this.image.onload = () => {
            // draw to canvas
            const h = this.image.height;
            const w = this.image.width;
            this.scale = Math.max(w / this.size, h / this.size);
            this.offset_x = (this.size - w / this.scale) / 2.0;
            this.offset_y = (this.size - h / this.scale) / 2.0;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(this.image, this.offset_x, this.offset_y, w / this.scale, h / this.scale);
            // post to api
            $.ajax({
                url: '/api',
                method: 'POST',
                data: {
                    image: this.image.src
                },
                success: (result) => {
                    $('#response').text(JSON.stringify(result, null, '  '));
                    this.drawFaceRect(result.faces);
                }
            });
        };
        this.image.onerror = () => {
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            alert('Failed to load image.');
        };
        // drag and drop
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        this.canvas.addEventListener('drop', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const reader = new window.FileReader();
            if (e.dataTransfer.files.length > 0) {
                reader.onload = (e) => {
                    this.image.src = e.target.result;
                };
                reader.readAsDataURL(e.dataTransfer.files[0]);
            }
        });
    }
    enableSelectFile(file) {
        file.addEventListener('change', (e) => {
            const reader = new window.FileReader();
            if (e.target.files.length > 0) {
                reader.onload = (e) => {
                    this.image.src = e.target.result;
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }
    drawFaceRect(faces) {
        const rotete = (target, center, rad) => {
            return [
                + Math.cos(rad) * target.x + Math.sin(rad) * target.y - center.x * Math.cos(rad) - center.y * Math.sin(rad) + center.x,
                - Math.sin(rad) * target.x + Math.cos(rad) * target.y + center.x * Math.sin(rad) - center.y * Math.cos(rad) + center.y
            ];
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
            this.ctx.beginPath();
            this.ctx.moveTo(...rotete(v[0], center, -radian));
            this.ctx.lineTo(...rotete(v[1], center, -radian));
            this.ctx.lineTo(...rotete(v[2], center, -radian));
            this.ctx.lineTo(...rotete(v[3], center, -radian));
            this.ctx.closePath();
            this.ctx.stroke();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const main = new Main(document.getElementById('canvas'));
    main.enableSelectFile(document.getElementById('file'));
});
