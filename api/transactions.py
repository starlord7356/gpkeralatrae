from flask import Blueprint, request, jsonify
from flask_pymongo import PyMongo
from datetime import datetime
from pytz import timezone
from bson import ObjectId

transactions_bp = Blueprint('transactions', __name__)
mongo_instance = None

# Define IST timezone
ist = timezone('Asia/Kolkata')

@transactions_bp.route('/api/transactions', methods=['GET'])
def get_transactions():
    try:
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        username = request.args.get('username', '')
        date_range = request.args.get('dateRange', '')
        waste_type = request.args.get('wasteType', '')
        min_points = request.args.get('minPoints', '')
        max_points = request.args.get('maxPoints', '')
        center = request.args.get('center', '')

        # Build query filter
        query = {}
        if center:
            query['center'] = center
        if username:
            query['username'] = {'$regex': username, '$options': 'i'}
        if waste_type:
            query['wasteType'] = waste_type
        if date_range:
            dates = date_range.split(' to ')
            if len(dates) == 2:
                start_date = datetime.strptime(dates[0], '%Y-%m-%d')
                end_date = datetime.strptime(dates[1], '%Y-%m-%d')
                query['created_at'] = {
                    '$gte': start_date,
                    '$lte': end_date
                }
        if min_points:
            query['points'] = {'$gte': float(min_points)}
        if max_points:
            if 'points' in query:
                query['points']['$lte'] = float(max_points)
            else:
                query['points'] = {'$lte': float(max_points)}

        # Calculate skip value for pagination
        skip = (page - 1) * limit

        # Get total count for pagination
        total = mongo_instance.db.transactions.count_documents(query)

        # Get transactions with pagination
        transactions = list(mongo_instance.db.transactions
            .find(query)
            .sort('created_at', -1)
            .skip(skip)
            .limit(limit))

        # Calculate summary statistics
        stats = {
            'totalQuantity': sum(float(t['quantity']) for t in transactions),
            'totalPoints': sum(t['points'] for t in transactions),
            'totalTransactions': total,
            'centerName': center if center else 'All Centers'
        }

        # Convert ObjectId to string for JSON serialization
        for transaction in transactions:
            transaction['_id'] = str(transaction['_id'])
            transaction['created_at'] = transaction['created_at'].isoformat()

        return jsonify({
            'success': True,
            'transactions': transactions,
            'total': total,
            'stats': stats
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@transactions_bp.route('/api/transactions', methods=['POST'])
def create_transaction():
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['username', 'wasteType', 'quantity', 'center']
    for field in required_fields:
        if field not in data:
            return jsonify({
                'success': False,
                'message': f'Missing required field: {field}'
            }), 400
    
    # Calculate points based on waste type and quantity
    points = calculate_points(data['wasteType'], data['quantity'])
    
    # Create transaction document
    transaction = {
        'username': data['username'],
        'wasteType': data['wasteType'],
        'quantity': data['quantity'],
        'points': points,
        'center': data['center'],
        'status': 'pending',
        'created_at': datetime.now(ist).astimezone(ist),
        'original_points': points
    }
    
    try:
        # Insert transaction
        result = mongo_instance.db.transactions.insert_one(transaction)
        
        # Update user's total points
        mongo_instance.db.users.update_one(
            {'username': data['username']},
            {'$inc': {'points': points}}
        )
        
        return jsonify({
            'success': True,
            'message': 'Transaction created successfully',
            'transaction_id': str(result.inserted_id)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

def calculate_points(waste_type, quantity):
    # Points calculation logic based on waste type
    points_per_kg = {
        'plastic': 11,
        'electronic': 16,
        'organic': 5,
        'metal': 13,
        'paper': 8,
        'glass': 8
    }
    
    return points_per_kg.get(waste_type.lower(), 0) * float(quantity)

@transactions_bp.route('/api/transactions/<transaction_id>', methods=['PUT'])
def update_transaction(transaction_id):
    try:
        data = request.get_json()
        
        # Validate transaction_id format
        if not ObjectId.is_valid(transaction_id):
            return jsonify({
                'success': False,
                'message': 'Invalid transaction ID format'
            }), 400

        # Find the transaction
        transaction = mongo_instance.db.transactions.find_one({'_id': ObjectId(transaction_id)})
        if not transaction:
            return jsonify({
                'success': False,
                'message': 'Transaction not found'
            }), 404

        # Calculate new points if waste type or quantity changed
        new_points = transaction['points']
        if 'wasteType' in data or 'quantity' in data:
            waste_type = data.get('wasteType', transaction['wasteType'])
            quantity = data.get('quantity', transaction['quantity'])
            new_points = calculate_points(waste_type, quantity)

        # Calculate points difference
        points_difference = new_points - transaction['points']

        # Update transaction
        update_data = {}
        for field in ['username', 'wasteType', 'quantity', 'center', 'status']:
            if field in data:
                update_data[field] = data[field]
        if new_points != transaction['points']:
            update_data['points'] = new_points

        if update_data:
            # Update the transaction
            result = mongo_instance.db.transactions.update_one(
                {'_id': ObjectId(transaction_id)},
                {'$set': update_data}
            )

            # Update user's total points if points changed
            if points_difference != 0:
                mongo_instance.db.users.update_one(
                    {'username': transaction['username']},
                    {'$inc': {'points': points_difference}}
                )

            return jsonify({
                'success': True,
                'message': 'Transaction updated successfully'
            })

        return jsonify({
            'success': True,
            'message': 'No changes made to the transaction'
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@transactions_bp.route('/api/transactions/<transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    try:
        # Validate transaction_id format
        if not ObjectId.is_valid(transaction_id):
            return jsonify({
                'success': False,
                'message': 'Invalid transaction ID format'
            }), 400

        # Find the transaction
        transaction = mongo_instance.db.transactions.find_one({'_id': ObjectId(transaction_id)})
        if not transaction:
            return jsonify({
                'success': False,
                'message': 'Transaction not found'
            }), 404

        # Delete the transaction
        result = mongo_instance.db.transactions.delete_one({'_id': ObjectId(transaction_id)})

        # Update user's total points
        mongo_instance.db.users.update_one(
            {'username': transaction['username']},
            {'$inc': {'points': -transaction['points']}}
        )

        return jsonify({
            'success': True,
            'message': 'Transaction deleted successfully'
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

def init_transactions_routes(mongo):
    global mongo_instance
    mongo_instance = mongo