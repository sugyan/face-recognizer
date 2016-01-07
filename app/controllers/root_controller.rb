class RootController < ApplicationController
  FACE_SIZE = 32

  include Image

  def index
  end

  def api
    data = params.require(:image)
    image = Magick::Image.from_blob(Base64.decode64(data.split(',')[1])).first
    faces = detect_faces(image)
    faces.each do |face|
      next unless face[:bounding].all? { |v| v['x'] && v['y'] }
      logger.debug(face)
      img = face_image(image, face, FACE_SIZE)
      face[:recognize] = classify_face(img)
      img.destroy!
    end
    image.destroy!
    render json: { faces: faces }
  end
end
