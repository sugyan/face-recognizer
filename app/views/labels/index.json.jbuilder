json.array!(@labels) do |label|
  json.extract! label, :id, :name, :index_number
  json.url label_url(label, format: :json)
end
