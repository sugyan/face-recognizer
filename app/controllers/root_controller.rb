class RootController < ApplicationController
  FACE_SIZE = 32

  include Image

  def index
  end

  def api
    data = params.require(:image)
    image = Magick::Image.from_blob(Base64.decode64(data.split(',')[1])).first.auto_orient
    faces = detect_faces(image).select do |face|
      face[:bounding].all? { |v| v['x'] && v['y'] }
    end
    labels = Label.all.index_by(&:index_number)
    faces.each do |face|
      logger.debug(face)
      img = face_image(image, face, FACE_SIZE)
      classified = classify_face(img)
      face[:recognize] = classified.map.with_index do |e, i|
        [labels[i] ? labels[i].name : i, e * 100.0]
      end
      img.destroy!
    end
    image.destroy!
    render json: { faces: faces }
  end
end
