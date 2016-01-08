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
    faces.each do |face|
      logger.debug(face)
      img = face_image(image, face, FACE_SIZE)
      face[:recognize] = classify_face(img)
      img.destroy!
    end
    image.destroy!
    render json: { faces: faces }
  end
end
