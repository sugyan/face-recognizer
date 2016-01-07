class RootController < ApplicationController
  include Image

  def index
  end

  def api
    data = params.require(:image)
    image = Magick::Image.from_blob(Base64.decode64(data.split(',')[1])).first
    faces = recognized_faces(image)
    image.destroy!
    render json: faces
  end
end
