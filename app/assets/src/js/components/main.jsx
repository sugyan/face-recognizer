/* global $, React, EXIF */

class Main extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            faces: []
        };
    }
    updateFaces(faces) {
        this.setState({
            faces: faces
        });
    }
    render() {
        return (
            <div className="row">
              <div className="col-xs-12 col-sm-9 col-md-8 col-lg-6">
                <ImageLoader onFacesUpdated={this.updateFaces.bind(this)}/>
              </div>
              <div className="col-xs-12 col-sm-9 col-md-4 col-lg-6">
                <ResultList faces={this.state.faces}/>
              </div>
            </div>
        );
    }
}

class ImageLoader extends React.Component {
    drawImage(image) {
        const ctx = this.refs.canvas.getContext('2d');
        const h = image.height;
        const w = image.width;
        const scale = Math.max(w / this.size, h / this.size);
        let offset_x = (this.size - w / scale) / 2.0;
        let offset_y = (this.size - h / scale) / 2.0;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.size, this.size);
        /* rotate image */
        EXIF.getData(image, () => {
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
            const orientation = EXIF.getTag(image, 'Orientation');
            ctx.transform(...transforms[orientation || 1]);
            ctx.drawImage(image, offset_x, offset_y, w / scale, h / scale);
            ctx.setTransform(...transforms[1]);
            if ((orientation || 1) > 4) {
                [offset_x, offset_y] = [offset_y, offset_x];
            }
        });
        /* post to api */
        const req = this.req = Math.floor(Math.random() * 0xFFFFFFFF);
        $.ajax({
            url: '/api',
            method: 'POST',
            data: {
                image: image.src
            },
            success: (result) => {
                if (this.req !== req) {
                    return;
                }
                const rotate = (target, center, rad) => {
                    return {
                        x:   Math.cos(rad) * target.x + Math.sin(rad) * target.y - center.x * Math.cos(rad) - center.y * Math.sin(rad) + center.x,
                        y: - Math.sin(rad) * target.x + Math.cos(rad) * target.y + center.x * Math.sin(rad) - center.y * Math.cos(rad) + center.y
                    };
                };
                const face_url = (face) => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const radian = face.angle.roll * Math.PI / 180.0;
                    const s = 96 / Math.max(Math.abs(face.bounding[0].x - face.bounding[2].x), Math.abs(face.bounding[0].y - face.bounding[2].y));
                    canvas.width = canvas.height = 112;
                    ctx.translate(56, 56);
                    ctx.scale(s, s);
                    ctx.rotate(-radian);
                    ctx.translate(-(face.bounding[0].x + face.bounding[2].x) / 2.0, -(face.bounding[0].y + face.bounding[2].y) / 2.0);
                    ctx.drawImage(image, 0, 0);
                    return canvas.toDataURL();
                }
                const faces = [];
                result.faces.forEach((face) => {
                    const v = face.bounding.map((e) => {
                        return {
                            x: e.x / scale + offset_x,
                            y: e.y / scale + offset_y
                        };
                    });
                    const center = {
                        x: (v[0].x + v[2].x) / 2.0,
                        y: (v[0].y + v[2].y) / 2.0
                    };
                    const radian = face.angle.roll * Math.PI / 180.0;
                    const p = v.map((e) => rotate(e, center, -radian));
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#8888FF';
                    ctx.beginPath();
                    ctx.moveTo(p[0].x, p[0].y);
                    ctx.lineTo(p[1].x, p[1].y);
                    ctx.lineTo(p[2].x, p[2].y);
                    ctx.lineTo(p[3].x, p[3].y);
                    ctx.closePath();
                    ctx.stroke();

                    faces.push({
                        url: face_url(face),
                        result: face.recognize
                    });
                });
                this.props.onFacesUpdated(faces);
            },
            error: (_, e) => {
                window.console.error(e);
            }
        });
    }
    readFile(file) {
        const reader = new window.FileReader();
        reader.onload = (e) => {
            const image = new window.Image();
            image.onload = this.drawImage.bind(this, image);
            image.onerror = () => {
                const ctx = this.refs.canvas.getContext('2d');
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, this.size, this.size);
                alert('Failed to load image.');
            };
            image.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    componentDidMount() {
        this.size = Math.min($(window).width() - 30, 512);
        this.refs.canvas.width = this.refs.canvas.height = this.size;
        this.refs.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        this.refs.canvas.addEventListener('drop', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) {
                this.readFile(e.dataTransfer.files[0]);
            }
        });
        this.refs.file.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.readFile(e.target.files[0]);
            }
        });
    }
    render() {
        return (
            <div>
              <canvas ref="canvas" style={{border: '1px gray solid'}}></canvas>
              <p>drag and drop or select image.</p>
              <input ref="file" type="file" accept="image/*" id="file"/>
            </div>
        );
    }
}

class ResultList extends React.Component {
    render() {
        const faces = this.props.faces.map((e, i) => {
            return (
                <div key={i}>
                  <img src={e.url}/>
                  {JSON.stringify(e.result)}
                </div>
            );
        });
        return (
            <div>{faces}</div>
        );
    }
}
