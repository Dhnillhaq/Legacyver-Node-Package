from flask import Flask, Blueprint, jsonify, request

app = Flask(__name__)
api = Blueprint('api', __name__)

@api.route('/health')
def health_check():
    return jsonify({'status': 'ok'})

@api.route('/items', methods=['GET'])
def list_items():
    items = [{'id': 1, 'name': 'Widget'}, {'id': 2, 'name': 'Gadget'}]
    return jsonify(items)

@api.route('/items/<int:item_id>', methods=['GET'])
def get_item(item_id):
    if item_id == 1:
        return jsonify({'id': 1, 'name': 'Widget', 'price': 9.99})
    return jsonify({'error': 'Not found'}), 404

@api.route('/items', methods=['POST'])
def create_item():
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'error': 'Missing name'}), 400
    return jsonify({'id': 3, 'name': data['name']}), 201

app.register_blueprint(api, url_prefix='/api')

if __name__ == '__main__':
    app.run(debug=True)
