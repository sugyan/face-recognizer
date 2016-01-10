class CreateLabels < ActiveRecord::Migration
  def change
    create_table :labels do |t|
      t.string :name
      t.integer :index_number

      t.timestamps null: false
    end
    add_index :labels, :index_number, unique: true
  end
end
