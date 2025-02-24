from flask import Flask, request, jsonify, render_template, session, redirect, url_for, send_from_directory
from flask_pymongo import PyMongo
from flask_cors import CORS
from bson import ObjectId
from functools import wraps
from datetime import datetime
from pytz import timezone
import os
from api.transactions import transactions_bp, init_transactions_routes

# Define IST timezone
ist = timezone('Asia/Kolkata')

app = Flask(__name__, static_folder='assets')
CORS(app, supports_credentials=True)

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'assets'),
                             'favicon.ico', mimetype='image/vnd.microsoft.icon')

# Configure MongoDB
app.config['MONGO_URI'] = 'mongodb://localhost:27017/gpkeralaultra'
app.secret_key = 'your-secret-key-here'  # Change this to a secure secret key
mongo = PyMongo(app)

# Admin credentials and centers
admin_data = [
    {"username": "gpkerala1", "password": "gpkerala1", "center": "Thiruvananthapuram Centre"},
    {"username": "gpkerala2", "password": "gpkerala2", "center": "Kollam Centre"},
    {"username": "gpkerala3", "password": "gpkerala3", "center": "Pathanamthitta Centre"},
    {"username": "gpkerala4", "password": "gpkerala4", "center": "Alappuzha Centre"},
    {"username": "gpkerala5", "password": "gpkerala5", "center": "Kottayam Centre"},
    {"username": "gpkerala6", "password": "gpkerala6", "center": "Idukki Centre"},
    {"username": "gpkerala7", "password": "gpkerala7", "center": "Ernakulam Centre"},
    {"username": "gpkerala8", "password": "gpkerala8", "center": "Thrissur Centre"},
    {"username": "gpkerala9", "password": "gpkerala9", "center": "Palakkad Centre"},
    {"username": "gpkerala10", "password": "gpkerala10", "center": "Malappuram Centre"},
    {"username": "gpkerala11", "password": "gpkerala11", "center": "Kozhikode Centre"},
    {"username": "gpkerala12", "password": "gpkerala12", "center": "Wayanad Centre"},
    {"username": "gpkerala13", "password": "gpkerala13", "center": "Kannur Centre"},
    {"username": "gpkerala14", "password": "gpkerala14", "center": "Kasaragod Centre"}
]

# Initialize the database with admin data if it's empty
def init_db():
    if mongo.db.admins.count_documents({}) == 0:
        mongo.db.admins.insert_many(admin_data)

# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    # Check admin collection first
    admin = mongo.db.admins.find_one({'username': username, 'password': password})
    if admin:
        session['username'] = username
        session['user_type'] = 'admin'
        return jsonify({
            'success': True,
            'center': admin['center'],
            'user_type': 'admin'
        })
    
    # If not admin, check users collection
    user = mongo.db.users.find_one({'username': username, 'password': password})
    if user:
        session['username'] = username
        session['user_type'] = 'user'
        return jsonify({
            'success': True,
            'name': user['name'],
            'user_type': 'user'
        })
    
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

@app.route('/api/logout')
def logout():
    session.pop('username', None)
    return jsonify({'success': True})

@app.route('/api/user-info')
@login_required
def get_user_info():
    username = session.get('username')
    user_type = session.get('user_type')
    
    if user_type == 'admin':
        user = mongo.db.admins.find_one({'username': username})
        if user:
            return jsonify({
                'username': user['username'],
                'center': user['center'],
                'user_type': 'admin'
            })
    else:
        user = mongo.db.users.find_one({'username': username})
        if user:
            return jsonify({
                'username': user['username'],
                'name': user['name'],
                'email': user['email'],
                'dob': user.get('dob', ''),
                'user_type': 'user'
            })
    
    return jsonify({'error': 'User not found'}), 404

@app.route('/api/user/<username>')
def check_user(username):
    user = mongo.db.users.find_one({'username': username})
    if user:
        return jsonify({
            'success': True,
            'message': 'User found',
            'currentGP': user.get('points', 0)
        })
    return jsonify({
        'success': False,
        'message': 'User not found'
    }), 404

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

@app.route('/api/update-profile', methods=['POST'])
@login_required
def update_profile():
    data = request.get_json()
    username = session.get('username')
    
    # Check if new username already exists (excluding current user)
    if data['username'] != username and mongo.db.users.find_one({'username': data['username']}):
        return jsonify({
            'success': False,
            'error': 'username_exists',
            'message': 'Username already exists'
        }), 400
    
    # Check if new email already exists (excluding current user)
    current_user = mongo.db.users.find_one({'username': username})
    if data['email'] != current_user['email'] and mongo.db.users.find_one({'email': data['email']}):
        return jsonify({
            'success': False,
            'error': 'email_exists',
            'message': 'Email already registered'
        }), 400
    
    # Update user profile
    try:
        mongo.db.users.update_one(
            {'username': username},
            {'$set': {
                'name': data['name'],
                'username': data['username'],
                'email': data['email'],
                'dob': data['dob']
            }}
        )
        
        # Update session if username changed
        if data['username'] != username:
            session['username'] = data['username']
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to update profile'
        }), 500

@app.route('/api/update-password', methods=['POST'])
@login_required
def update_password():
    data = request.get_json()
    username = session.get('username')
    
    # Verify current password
    user = mongo.db.users.find_one({'username': username})
    if user['password'] != data['currentPassword']:
        return jsonify({
            'success': False,
            'error': 'invalid_password',
            'message': 'Invalid current password'
        }), 400
    
    # Update password
    try:
        mongo.db.users.update_one(
            {'username': username},
            {'$set': {'password': data['newPassword']}}
        )
        return jsonify({
            'success': True,
            'message': 'Password updated successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to update password'
        }), 500

@app.route('/api/admin/center-info')
@login_required
def get_center_info():
    username = session.get('username')
    user_type = session.get('user_type')
    
    if user_type != 'admin':
        return jsonify({'error': 'Unauthorized access'}), 403
    
    admin = mongo.db.admins.find_one({'username': username})
    if admin:
        return jsonify({
            'success': True,
            'center': admin['center']
        })
    return jsonify({'error': 'Admin not found'}), 404

@app.route('/api/admin/transactions')
@login_required
def get_transactions():
    username = session.get('username')
    user_type = session.get('user_type')
    
    if user_type != 'admin':
        return jsonify({'error': 'Unauthorized access'}), 403
    
    admin = mongo.db.admins.find_one({'username': username})
    if not admin:
        return jsonify({'error': 'Admin not found'}), 404
    
    try:
        # Query transactions for the admin's center directly
        transactions = list(mongo.db.transactions.find({'center': admin['center']}).sort('created_at', -1))
        
        if not transactions:
            return jsonify({
                'transactions': [],
                'total': 0,
                'stats': {
                    'total_points': 0,
                    'total_quantity': 0
                }
            })
            
        formatted_transactions = []
        for transaction in transactions:
            try:
                # Ensure consistent field mapping
                waste_type = transaction.get('wasteType')
                if not waste_type:
                    waste_type = transaction.get('waste_type', 'Others')
                
                # Standardize date formatting
                created_at = transaction.get('created_at')
                if created_at:
                    if isinstance(created_at, str):
                        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    # Use ISO format for consistent parsing
                    date_str = created_at.astimezone(ist).isoformat()
                else:
                    date_str = datetime.now(ist).isoformat()
                
                formatted_transaction = {
                    'id': str(transaction['_id']),
                    'username': transaction.get('username', ''),
                    'wasteType': waste_type,
                    'quantity': float(transaction.get('quantity', 0)),
                    'points': float(transaction.get('points', 0)),
                    'status': transaction.get('status', 'pending'),
                    'date': date_str,
                    'edited': transaction.get('edited', False)
                }
                formatted_transactions.append(formatted_transaction)
            except Exception as e:
                print(f'Error formatting transaction: {str(e)}')
                continue
                
        # Calculate total stats
        total_points = sum(t.get('points', 0) for t in formatted_transactions)
        total_quantity = sum(t.get('quantity', 0) for t in formatted_transactions)

        return jsonify({
            'transactions': formatted_transactions,
            'total': len(formatted_transactions),
            'stats': {
                'total_points': total_points,
                'total_quantity': total_quantity
            }
        })
    except Exception as e:
        print(f'Error fetching transactions: {str(e)}')
        return jsonify({
            'success': False,
            'message': f'Failed to fetch transactions: {str(e)}'
        }), 500

@app.route('/api/admin/transactions/<transaction_id>', methods=['PUT'])
@login_required
def update_transaction(transaction_id):
    username = session.get('username')
    user_type = session.get('user_type')
    
    if user_type != 'admin':
        return jsonify({'error': 'Unauthorized access'}), 403
    
    data = request.get_json()
    try:
        # Update transaction
        result = mongo.db.transactions.update_one(
            {'_id': ObjectId(transaction_id)},
            {'$set': {
                'wasteType': data['wasteType'],
                'quantity': data['quantity'],
                'points': data['points'],
                'edited': True,
                'last_edited_by': username,
                'last_edited_at': datetime.now(ist)
            }}
        )
        
        if result.modified_count > 0:
            # Update user's total points
            transaction = mongo.db.transactions.find_one({'_id': ObjectId(transaction_id)})
            if transaction:
                # Calculate points difference
                old_points = transaction.get('original_points', transaction['points'])
                points_diff = data['points'] - old_points
                
                # Update user's total points
                mongo.db.users.update_one(
                    {'username': transaction['username']},
                    {'$inc': {'points': points_diff}}
                )
            
            return jsonify({
                'success': True,
                'message': 'Transaction updated successfully'
            })
        
        return jsonify({
            'success': False,
            'message': 'Transaction not found'
        }), 404
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/admin/transactions/<transaction_id>', methods=['DELETE'])
@login_required
def delete_transaction(transaction_id):
    username = session.get('username')
    user_type = session.get('user_type')
    
    if user_type != 'admin':
        return jsonify({'error': 'Unauthorized access'}), 403
    
    try:
        # Validate transaction ID format
        try:
            transaction_id_obj = ObjectId(transaction_id)
        except Exception:
            return jsonify({
                'success': False,
                'message': 'Invalid transaction ID format'
            }), 400

        # Find the transaction first to get points info
        transaction = mongo.db.transactions.find_one({'_id': transaction_id_obj})
        if not transaction:
            return jsonify({
                'success': False,
                'message': 'Transaction not found'
            }), 404
        
        # Verify admin has access to this center's transactions
        admin = mongo.db.admins.find_one({'username': username})
        if not admin or admin['center'] != transaction.get('center'):
            return jsonify({
                'success': False,
                'message': 'Unauthorized to delete this transaction'
            }), 403

        # Delete the transaction
        result = mongo.db.transactions.delete_one({'_id': transaction_id_obj})
        
        if result.deleted_count > 0:
            # Update user's total points by deducting the transaction points
            mongo.db.users.update_one(
                {'username': transaction['username']},
                {'$inc': {'points': -float(transaction['points'])}}
            )
            
            return jsonify({
                'success': True,
                'message': 'Transaction deleted successfully'
            })
        
        return jsonify({
            'success': False,
            'message': 'Failed to delete transaction'
        }), 500
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error deleting transaction: {str(e)}'
        }), 500

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()
    
    # Check if username already exists
    if mongo.db.users.find_one({'username': data['username']}):
        return jsonify({
            'success': False,
            'error': 'username_exists',
            'message': 'Username already exists'
        }), 400
    
    # Check if email already exists
    if mongo.db.users.find_one({'email': data['email']}):
        return jsonify({
            'success': False,
            'error': 'email_exists',
            'message': 'Email already registered'
        }), 400
    
    # Create new user document
    new_user = {
        'name': data['name'],
        'dob': data['dob'],
        'email': data['email'],
        'username': data['username'],
        'password': data['password'],  # In production, hash the password
        'created_at': datetime.now(ist)
    }
    
    try:
        mongo.db.users.insert_one(new_user)
        return jsonify({
            'success': True,
            'message': 'Registration successful'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Registration failed'
        }), 500

# Register blueprints and initialize routes
init_transactions_routes(mongo)
app.register_blueprint(transactions_bp)

if __name__ == '__main__':
    init_db()
    app.run(debug=True)