require 'rvg/rvg'

module Image
  FACE_SIZE = 32

  def faces(image)
    url = URI(ENV['GOOGLE_CLOUD_VISION_API_ENDPOINT'])
    res = HTTPClient.new.post(url, generate_json(image), 'Content-Type' => 'application/json')
    result = JSON.parse(res.body)
    result['responses'][0]['faceAnnotations'].map do |annotation|
      {
        bounding: annotation['boundingPoly']['vertices'],
        angle: {
          roll: annotation['rollAngle'],
          yaw: annotation['panAngle'],
          pitch: annotation['tiltAngle'],
        }
      }
    end
  end

  def recognized_faces(image)
    faces(image).each do |face|
      img = face_image(image, face, FACE_SIZE)
      img.format = 'JPG'
      input = 'data:image/jpeg;base64,' + Base64.strict_encode64(img.to_blob)
      res = HTTPClient.new.post(ENV['CLASSIFIER_API_ENDPOINT'], image: input)
      face[:recognize] = JSON.parse(res.body)
      img.destroy!
    end
  end

  private

  def face_image(image, face, size)
    x = face[:bounding].map { |v| v['x'] }
    y = face[:bounding].map { |v| v['y'] }
    rvg = Magick::RVG.new(size, size) do |canvas|
      scale = 1.0 * size / [x.max - x.min, y.max - y.min].max
      canvas
        .image(image)
        .translate(size * 0.5, size * 0.5)
        .scale(scale)
        .rotate(-face[:angle][:roll])
        .translate(-(x.min + x.max) * 0.5, -(y.min + y.max) * 0.5)
    end
    rvg.draw
  end

  def generate_json(image)
    image.format = 'JPG'
    {
      requests: [
        {
          image: { content: Base64.strict_encode64(image.to_blob) },
          features: [{ type: 'FACE_DETECTION', maxResults: 10 }]
        }
      ]
    }.to_json
  end
end
