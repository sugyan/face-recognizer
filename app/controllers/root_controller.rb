class RootController < ApplicationController
  FACE_SIZE = 112

  include Image

  def index
  end

  def api
    # decode requested image
    data = params.require(:image)
    image = Magick::Image.from_blob(Base64.decode64(data.split(',')[1])).first.auto_orient
    # detect faces
    detected = detect_faces(image).select do |face|
      face[:bounding].all? { |v| v['x'] && v['y'] }
    end
    # create face images
    faces = detected.map do |face|
      img = face_image(image, face, FACE_SIZE)
      img.format = 'JPG'
      b64 = Base64.strict_encode64(img.to_blob)
      img.destroy!
      'data:image/jpeg;base64,' + b64
    end
    image.destroy!
    # classify faces
    classified = classify_faces(faces).map do |r|
      r.map { |v| format('%.3f', v * 100.0).to_f }
    end
    # label name and response
    labels = Rails.cache.fetch('labels') do
      data = JSON.parse(HTTPClient.new.get_content(ENV['LABEL_API_ENDPOINT'])).map do |e|
        n = e.delete('index_number')
        n ? [n, e] : []
      end
      Hash[*data.flatten]
    end
    detected.each.with_index do |face, i|
      face[:recognize] = classified[i].map.with_index do |e, j|
        [labels[j] ? labels[j]['name'] : j, e]
      end
    end
    render json: { faces: detected, message: format('detected %d faces.', detected.size) }
  end
end
