var Groups = require('../app/models/Groups'),
	Crypter = require('../app/utils/crypting'),
	Users = require('../app/models/Users'),
	Chatlog = require('../app/models/Chatlog');

module.exports = function (server)
{
	//GET routes
	//general
	server.route({
		method: 'GET',
		path: '/',
		handler: function (request, reply)
		{
			if (request.state['alias'] == undefined)
			{
				//User not logged in
				reply.view('index', {});
			} else
			{
				//User logged in
				reply.redirect('/home');
			}
		}
	});
	server.route({
		method: 'GET',
		path: '/home',
		handler: function (request, reply)
		{
			if (request.state['alias'] == undefined)
			{
				//User not logged in
				reply.redirect('/');
			} else
			{
				//User logged in
				var groups = {};
				Groups.find({ 'isVisible': true }, function (err, groups)
				{
					if (err)
					{
						reply("Server Error");
						return;
					}
					Users.find({ 'alias': Crypter.decrypt(request.state['alias']) }, function (err, result)
					{
						if (err)
						{
							reply.view('home', { 'groups': groups, 'alias': 'Error', 'isPersistent': false });
							return;
						}
						reply.view('home', { 'groups': groups, 'alias': result[0].alias, 'isPersistent': result[0].isPersistent });
					});

				});
			}
		}
	});
	server.route({
		method: 'GET',
		path: '/groups',
		handler: function (request, reply)
		{
			if (request.state['alias'] == undefined)
			{
				reply({'success':false, 'message':'Invalid Alias', 'data':[]});
			} else
			{
				Groups
				.find({ 'isVisible': true })
				.select('name description createdBy createdOn tags isPrivate')
				.exec(function (err, groups)
				{
					reply({'success':true, 'message': 'Groups fetched successfully', 'data':groups});
				});
			}
		}
	});
	server.route(
	{
		method: 'GET',
		path: '/groups/created',
		handler: function (request, reply)
		{
			if (request.state['alias'] == undefined)
			{
				reply.redirect('/');
			} else
			{
				Groups.find({ 'createdBy': Crypter.decrypt(request.state['alias']) }, function (err, docs)
				{
					if (err)
					{
						console.log(err);
						return;
					}
					if (docs.length === 0)
					{
						reply.view('created', { 'alias': Crypter.decrypt(request.state['alias']), 'createdGroups': docs, 'isEmpty': true })
					} else
					{
						reply.view('created', { 'alias': Crypter.decrypt(request.state['alias']), 'createdGroups': docs, 'isEmpty': false });
					}
				});
			}
		}
	});
	server.route(
	{
		method: 'GET',
		path: '/account',
		handler: function (request, reply)
		{
			if (request.state['alias'] == undefined)
			{
				reply.redirect('/');
			} else
			{
				Users.find({ 'alias': Crypter.decrypt(request.state['alias']) }, function (err, docs)
				{
					if (err)
					{
						console.log(err);
						return;
					}
					reply.view('account', { 'user': docs[0], 'alias': Crypter.decrypt(request.state['alias']) });
				});
			}
		}
	});
	server.route(
	{
		method: 'POST',
		path: '/account/changealias',
		handler: function (request, reply)
		{
			if (request.state['alias'] != undefined)
			{
				Users.findOne({ 'alias': Crypter.decrypt(request.state['alias']) }, function (err, doc)
				{
					if (err)
					{
						console.log(err);
						reply('Error: Database Operation failed');
						return;
					}
					if (request.payload.newAlias == request.payload.confirmNewAlias)
					{
						doc.alias = request.payload.newAlias;
						doc.save(function (err)
						{
							if (err)
							{
								console.log(err);
								reply('Error: Database Operation failed');
								return;
							}
							Groups.update({ 'createdBy': Crypter.decrypt(request.state['alias']) }, { 'createdBy': request.payload.newAlias }, { 'multi': true }, function (err, groupDocs)
							{
								if (err)
								{
									console.log(err);
									reply('Error: Database Operation failed');
									return;
								}
								reply({ 'success': true, 'aliasCookie': Crypter.encrypt(request.payload.newAlias), 'alias': request.payload.newAlias });
							});
						});
					} else
					{
						reply('Error: Alias mismatch');
					}
				});
			}
		}
	});
	server.route(
	{
		method: 'GET',
		path: '/groups/{id}',
		handler: function (request, reply)
		{
			if (request.state['alias'] == undefined)
			{
				//User not logged in
				reply.redirect('/');
			} else
			{
				Groups.find({ _id: request.params.id }, function (err, result)
				{
					if (result[0].isPrivate)
					{
						var cookieB = JSON.parse(Crypter.decrypt(request.state['_b']));
						if (cookieB[result[0]._id])
						{
							Chatlog.find({ groupId: request.params.id }).sort({ postedOn: -1 }).limit(20).exec(
								function (err, resultLogs)
								{
									if (err)
									{
										console.log(err);
										reply.view('chat', { name: result[0].name, groupId: result[0]._id });
										return;
									}
									reply.view('chat', { name: result[0].name, groupId: result[0]._id, chatHistory: resultLogs.reverse() });
								}
							);

						} else
						{
							reply.redirect('/home');
						}
					} else
					{
						Chatlog.find({ groupId: request.params.id }).sort({ postedOn: -1 }).limit(20).exec(
								function (err, resultLogs)
								{
									if (err)
									{
										console.log(err);
										reply.view('chat', { name: result[0].name, groupId: result[0]._id });
										return;
									}
									reply.view('chat', { name: result[0].name, groupId: result[0]._id, chatHistory: resultLogs.reverse() });
								}
							);
					}
				});
			}
		}
	});
	server.route({
		method: 'GET',
		path: '/home.js',
		handler: function (request, reply)
		{
			reply.file('./public/scripts/home.js');
		}
	});
	server.route({
		method: 'GET',
		path: '/chat.js',
		handler: function (request, reply)
		{
			reply.file('./public/scripts/chat.js');
		}
	});
	//resources
	server.route({
		method: 'GET',
		path: '/semantic.css',
		handler: function (request, reply)
		{
			reply.file('./bower_components/semantic/build/packaged/css/semantic.css');
		}
	});
	server.route({
		method: 'GET',
		path: '/semantic.min.css',
		handler: function (request, reply)
		{
			reply.file('./bower_components/semantic/build/packaged/css/semantic.min.css');
		}
	});
	server.route({
		method: 'GET',
		path: '/fonts/icons.woff',
		handler: function (request, reply)
		{
			reply.file('./bower_components/semantic/build/packaged/fonts/icons.woff');
		}
	});
	server.route({
		method: 'GET',
		path: '/fonts/icons.ttf',
		handler: function (request, reply)
		{
			reply.file('./bower_components/semantic/build/packaged/fonts/icons.ttf');
		}
	});
	server.route({
		method: 'GET',
		path: '/semantic.js',
		handler: function (request, reply)
		{
			reply.file('./bower_components/semantic/build/packaged/javascript/semantic.js');
		}
	});
	server.route({
		method: 'GET',
		path: '/semantic.min.js',
		handler: function (request, reply)
		{
			reply.file('./bower_components/semantic/build/packaged/javascript/semantic.min.js');
		}
	});
	server.route(
	{
		method: 'GET',
		path: '/perfect-scrollbar.min.css',
		handler: function (request, reply)
		{
			reply.file('./public/stylesheets/perfect-scrollbar.min.css');
		}
	});
	server.route(
	{
		method: 'GET',
		path: '/perfect-scrollbar.min.js',
		handler: function (request, reply)
		{
			reply.file('./public/scripts/perfect-scrollbar.min.js');
		}
	});
	server.route(
	{
		method: 'GET',
		path: '/inconsolata-bold.ttf',
		handler: function (request, reply)
		{
			reply.file('./public/fonts/inconsolata-bold.ttf');
		}
	});
	server.route(
	{
		method: 'GET',
		path: '/inconsolata-regular.ttf',
		handler: function (request, reply)
		{
			reply.file('./public/fonts/inconsolata-regular.ttf');
		}
	});
	server.route(
	{
		method: 'GET',
		path: '/favicon.ico',
		handler: function (request, reply)
		{
			reply.file('./public/images/favicon.ico');
		}
	});
	server.route(
	{
		method: 'GET',
		path: '/malihu-scrollbar.css',
		handler: function (request, reply)
		{
			reply.file('./public/stylesheets/malihu-scrollbar.css');
		}
	});
	server.route(
	{
		method: 'GET',
		path: '/malihu-scrollbar.concat.min.js',
		handler: function (request, reply)
		{
			reply.file('./public/scripts/malihu-scrollbar.concat.min.js');
		}
	});
	server.route(
	{
		method: 'GET',
		path: '/mCSB_buttons.png',
		handler: function (request, reply)
		{
			reply.file('./public/images/mCSB_buttons.png');
		}
	});
	server.route({
		method: 'GET',
		path: '/chatsy.css',
		handler: function (request, reply)
		{
			reply.file('./public/stylesheets/chatsy.css');
		}
	});
	server.route({
		method: 'GET',
		path: '/jquery.js',
		handler: function (request, reply)
		{
			reply.file('./bower_components/jquery/dist/jquery.js');
		}
	});
	server.route({
		method: 'GET',
		path: '/jquery.min.js',
		handler: function (request, reply)
		{
			reply.file('./bower_components/jquery/dist/jquery.min.js');
		}
	});
	server.route({
		method: 'GET',
		path: '/jquery.min.map',
		handler: function (request, reply)
		{
			reply.file('./bower_components/jquery/dist/jquery.min.map');
		}
	});

	//-----------------------------------------------------------------------
	//POST routes
	//general
	server.route({
		method: 'POST',
		path: '/',
		handler: function (request, reply)
		{
			if (request.payload.alias != undefined)
			{
				if (request.payload.passkey == undefined)
				{
					Users.find({ alias: request.payload.alias }, function (err, result)
					{
						if (result.length > 0)
						{
							reply({ 'success': false, 'message': 'Alias already exists' });
						} else
						{
							var newUser = new Users();
							newUser.alias = request.payload.alias;
							newUser.isPersistent = false;
							newUser.save(function (err)
							{
								if (err)
								{
									console.log(err);
									reply({ 'success': false, 'message': 'Database operation failed' });
								} else
								{
									reply({ 'success': true, 'message': 'User created successfully' }).state('alias', Crypter.encrypt(request.payload.alias));
								}
							});
						}
					});
				} else
				{
					Users.find({ 'alias': request.payload.alias }, function (err, docs)
					{
						if (docs.length > 0)
						{
							if (docs[0].validateKey(request.payload.passkey))
							{
								reply({ 'success': true, 'message': 'Validation successful' }).state('alias', Crypter.encrypt(request.payload.alias));
							} else
							{
								reply({ 'success': false, 'message': 'Validation failed' });
							}
						} else
						{
							var newUser = new Users();
							newUser.alias = request.payload.alias;
							newUser.passkey = newUser.generateHash(request.payload.passkey);
							newUser.isPersistent = true;
							newUser.save(function (err)
							{
								if (err)
								{
									console.log(err);
									reply({ 'success': false, 'message': 'Database operation failed' });
								} else
								{
									reply({ 'success': true, 'message': 'User created successfully' }).state('alias', Crypter.encrypt(request.payload.alias));
								}
							});
						}
					});
				}
			} else
			{
				reply({ 'success': false, 'message': 'Invalid Request' });
			}
		}
	});
	server.route({
		method: 'POST',
		path: '/groups/create',
		handler: function (request, reply)
		{
			if (request.payload.alias != undefined)
			{
				var newGroup = new Groups();
				newGroup.name = request.payload.name;
				newGroup.description = request.payload.description;
				newGroup.passkey = newGroup.generateHash(request.payload.key);
				newGroup.createdBy = Crypter.decrypt(request.payload.alias);
				newGroup.createdOn = Date();
				newGroup.isPrivate = request.payload.isPrivate;
				newGroup.isVisible = request.payload.isVisible;
				newGroup.authorizedUsers = [];
				newGroup.unauthorizedUsers = [];
				newGroup.admins = [];
				newGroup.authorizedUsers.push(Crypter.decrypt(request.payload.alias));
				newGroup.admins.push(Crypter.decrypt(request.payload.alias));
				newGroup.save(function (err)
				{
					if (err)
					{
						console.log(err);
						return;
					}
					Users.find({ 'alias': Crypter.decrypt(request.payload.alias) }, function (err, docs)
					{
						if (err)
						{
							console.log(err);
							return;
						}
						if (docs.length > 0)
						{
							docs[0].authorizedInGroups = [];
							docs[0].authorizedInGroups.push(newGroup._id.toString());
							docs[0].save(function (err)
							{
								if (err)
								{
									console.log(err);
									return;
								}
								reply({ 'success': true, 'message': 'Group created successfully' });
							});
						} else
						{
							reply({ 'success': false, 'message': 'Invalid alias' });
						}
					});
				});
			} else
			{
				reply("Error");
			}
		}
	});
	server.route(
	{
		method: 'POST',
		path: '/joinauth',
		handler: function (request, reply)
		{
			if (request.state['alias'] == undefined)
			{
				//User not logged in
				reply.file('./views/index.html');
			} else
			{
				Groups.find({ _id: request.payload.groupId }, function (err, result)
				{
					if (err)
					{
						console.log(err);
						reply("Error");
					}
					if (result[0].validateKey(request.payload.passkey))
					{
						console.log(request.payload.passkey);
						var cookieB = {};
						cookieB[result[0]._id] = true;
						reply("Success").state('_b', Crypter.encrypt(JSON.stringify(cookieB)));
					} else
					{
						console.log("Validation Failed");
						reply("Failure");
					}
				});
			}
		}
	});
	server.route(
	{
		method: 'POST',
		path: '/account/changetype',
		handler: function (request, reply)
		{
			if (request.state['alias'] != undefined)
			{
				if (request.payload.passkey == request.payload.confirmPasskey)
				{
					Users.findOne({ alias: Crypter.decrypt(request.state['alias']) }, function (err, doc)
					{
						if (err)
						{
							reply('Error - Query failed');
							return;
						}
						doc.isPersistent = true;
						doc.passkey = doc.generateHash(request.payload.passkey);
						//doc.lastInteractedOn = Date();
						doc.save(function (err)
						{
							if (err)
							{
								reply('Error - Update failed');
								return;
							}
							reply({ 'success': true, 'message': 'Account type updated', 'value': 'white' });
						});
					});
				} else
				{
					reply('Failed - Invalid Passkey');
					return;
				}
			} else
			{
				reply('Failed - Invalid Request');
				return;
			}
		}
	});
	server.route(
	{
		method: 'POST',
		path: '/groups/{id}/addusers',
		handler: function (request, reply)
		{
			if (request.state['alias'] == undefined)
			{
				reply({ 'success': false, 'message': 'Invalid source' });
			} else
			{
				Groups.find({ '_id': request.params.id }, function (err, docs)
				{
					if (err)
					{
						console.log(err);
						reply({ 'success': false, 'message': 'Internal Server Error' });
						return;
					}
					var users = request.payload.users.split(',');
					var failedTransactions = [];
					for (var i = 0; i < users.length; i++)
					{
						Users.findOne({ 'alias': users[i] }, function (err, doc)
						{
							if (doc && doc.isPersistent)
							{
								doc.authorizedInGroups = [];
								doc.authorizedInGroups.push(request.params.id);
								doc.save(function (err)
								{
									if (err)
									{
										console.log(err);
										failedTransactions.push(doc.alias + ' - Update failed for alias');
									}
									docs[0].authorizedUsers.push(users[i].trim());
								})
							} else
							{
								failedTransactions.push(users[i] + ' - Alias does not exist or is a gray user');
							}
						});
					}
					docs[0].save(function (err)
					{
						if (err)
						{
							console.log(err);
							reply({ 'success': false, 'message': 'Database operation failed' });
						}
						reply({ 'success': true, 'message': 'Preferences updated successfully', 'data': failedTransactions });
					})
				});
			}
		}
	});
	server.route(
	{
		method: 'POST',
		path: '/groups/{id}/blockusers',
		handler: function (request, reply)
		{
			if (request.state['alias'] == undefined)
			{
				reply({ 'success': false, 'message': 'Invalid source' });
			} else
			{
				Groups.find({ '_id': request.params.id }, function (err, docs)
				{
					if (err)
					{
						console.log(err);
						reply({ 'success': false, 'message': 'Internal Server Error' });
						return;
					}
					var users = request.payload.users.split(',');
					var failedTransactions = [];
					for (var i = 0; i < users.length; i++)
					{
						Users.findOne({ 'alias': users[i] }, function (err, doc)
						{
							if (doc && doc.isPersistent)
							{
								doc.unauthorizedInGroups = [];
								doc.unauthorizedInGroups.push(request.params.id);
								doc.save(function (err)
								{
									if (err)
									{
										console.log(err);
										failedTransactions.push(doc.alias + ' - Update failed for alias');
									}
									docs[0].unauthorizedUsers.push(users[i].trim());
								})
							} else
							{
								failedTransactions.push(users[i] + ' - Alias does not exist or is a gray user');
							}
						});
					}
					docs[0].save(function (err)
					{
						if (err)
						{
							console.log(err);
							reply({ 'success': false, 'message': 'Database operation failed' });
						}
						reply({ 'success': true, 'message': 'Preferences updated successfully', 'data': failedTransactions });
					})
				});
			}
		}
	});
};