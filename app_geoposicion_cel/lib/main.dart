import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:http/http.dart' as http;
import 'package:location/location.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: const LoginPage(),
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  _LoginPageState createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  String email = '';
  String password = '';
  String token = '';

  Future<void> login() async {
    final response = await http.post(
      Uri.parse(ApiUrls.acceso),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      setState(() {
        token = data['token'];
      });
      print('Inicio de sesión exitoso');
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => MainPage(token: token)),
      );
    } else {
      print('Error en el inicio de sesión');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Iniciar Sesión'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            TextField(
              onChanged: (value) {
                setState(() {
                  email = value;
                });
              },
              decoration: const InputDecoration(labelText: 'Email'),
            ),
            TextField(
              onChanged: (value) {
                setState(() {
                  password = value;
                });
              },
              decoration: const InputDecoration(labelText: 'Password'),
              obscureText: true,
            ),
            ElevatedButton(
              onPressed: login,
              child: const Text('Login'),
            ),
            TextButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const RegisterPage()),
                );
              },
              child: const Text('No tienes cuenta? Regístrate'),
            ),
          ],
        ),
      ),
    );
  }
}

class MainPage extends StatefulWidget {
  String token;
  MainPage({super.key, required this.token});

  @override
  _MainPageState createState() => _MainPageState();
}

class _MainPageState extends State<MainPage> {
  Location location = Location();
  List<dynamic> locations = [];
  LocationData? _currentLocation;
  String? selectedGroup;
  List<String> groups = ['familia', 'amigos', 'trabajo'];
  MapController mapController = MapController();
  double currentZoom = 13.0;
  TextEditingController userEmailController = TextEditingController();

  @override
  void initState() {
    super.initState();
    fetchLocations();
  }

  Future<void> updateLocation() async {
    _currentLocation = await location.getLocation();
    final response = await http.post(
      Uri.parse(ApiUrls.actualizarUbicacion),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${widget.token}',
      },
      body: jsonEncode({
        'latitud': _currentLocation?.latitude,
        'longitud': _currentLocation?.longitude,
      }),
    );

    if (response.statusCode == 200) {
      print('Ubicación actualizada');
      setState(() {
        locations.removeWhere((loc) => loc['isCurrentLocation'] == true); // Eliminar ubicación actual si existe
        locations.add({
          'latitud': _currentLocation?.latitude,
          'longitud': _currentLocation?.longitude,
          'isCurrentLocation': true, // Marca la ubicación como actual
        });
      });
    } else {
      print('Error al actualizar la ubicación');
    }
  }

  Future<void> fetchLocations() async {
    final url = Uri.parse('${ApiUrls.ubicaciones}?grupo=$selectedGroup');
    print('URL de solicitud de ubicaciones: $url'); // Añadido para depuración
    final response = await http.get(
      url,
      headers: {
        'Authorization': 'Bearer ${widget.token}',
      },
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      print('Datos recibidos: $data'); // Añadido para depuración

      // Procesar los datos para extraer las ubicaciones
      List<dynamic> fetchedLocations = [];
      for (var item in data) {
        if (item['location'] != null) {
          fetchedLocations.add({
            'latitud': item['location']['latitud'],
            'longitud': item['location']['longitud'],
            'isCurrentLocation': false,
          });
        }
      }

      print('Datos convertidos: $locations');

      setState(() {
        // Añadir la ubicación actual
        fetchedLocations.addAll(locations.where((loc) => loc['isCurrentLocation'] == true));
        locations = fetchedLocations;
      });

      print('Datos fetched convertidos: $locations');
    } else {
      print('Error al obtener ubicaciones: ${response.body}');
    }
  }

  Future<void> addUserToGroup(String userEmail, String group) async {
    final url = Uri.parse(ApiUrls.agregarGrupo);
    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${widget.token}',
      },
      body: jsonEncode({
        'email': userEmail,
        'grupo': group,
      }),
    );

    if (response.statusCode == 200) {
      print('Usuario agregado al grupo correctamente');
      fetchLocations(); // Actualizar la lista de ubicaciones después de agregar usuario
    } else {
      print('Error al agregar usuario al grupo: ${response.body}');
      // Manejar el error de acuerdo a tus necesidades
    }
  }

  Future<Map<String, dynamic>?> getUserByEmail(String email) async {
    final url = Uri.parse('${ApiUrls.usuario}/$email');
    final response = await http.get(
      url,
      headers: {
        'Authorization': 'Bearer ${widget.token}',
      },
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      print('Error al obtener usuario: ${response.body}');
      return null; // O manejar el error de acuerdo a tus necesidades
    }
  }

  void getUserAndShowDialog(String email) async {
    final userData = await getUserByEmail(email);
    if (userData != null) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Información de Usuario'),
          content: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Email: ${userData['email']}'),
              if (userData['location'] != null) ...[
                Text('Ubicación: ${userData['location']['latitud']}, ${userData['location']['longitud']}'),
              ] else ...[
                Text('Ubicación: No disponible'),
              ],
              // Agregar más información si es necesario
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cerrar'),
            ),
          ],
        ),
      );
    } else {
      // Manejar caso en que no se encuentre el usuario
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Usuario no encontrado'),
          content: const Text('No se encontró información para el usuario con el email proporcionado.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cerrar'),
            ),
          ],
        ),
      );
    }
  }

  void logout() {
    setState(() {
      widget.token = '';
    });
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => const LoginPage()),
    );
  }

  void zoomIn() {
    setState(() {
      currentZoom++;
      mapController.move(mapController.center, currentZoom);
    });
  }

  void zoomOut() {
    setState(() {
      currentZoom--;
      mapController.move(mapController.center, currentZoom);
    });
  }

  void onGroupChanged(String? group) {
    setState(() {
      selectedGroup = group;
      print('Grupo seleccionado: $selectedGroup'); // Añadido para depuración
      fetchLocations();
    });
  }

  void addUserByEmail() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Agregar Usuario'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: userEmailController,
              decoration: const InputDecoration(
                labelText: 'Correo del usuario',
              ),
            ),
            const SizedBox(height: 10),
            StatefulBuilder(
              builder: (BuildContext context, StateSetter setState) {
                return DropdownButton<String>(
                  value: selectedGroup,
                  hint: const Text('Selecciona un grupo'),
                  onChanged: (String? newValue) {
                    setState(() {
                      selectedGroup = newValue;
                    });
                  },
                  items: groups.map((String group) {
                    return DropdownMenuItem<String>(
                      value: group,
                      child: Text(group),
                    );
                  }).toList(),
                );
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop(); // Cerrar el cuadro de diálogo
            },
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () {
              final email = userEmailController.text;
              if (email.isNotEmpty && selectedGroup != null) {
                addUserToGroup(email, selectedGroup!);
                Navigator.of(context).pop(); // Cerrar el cuadro de diálogo
              }
            },
            child: const Text('Agregar'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    print('Ubicaciones en el mapa: $locations'); // Añadido para depuración
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mapa de Ubicaciones'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: logout,
          ),
        ],
      ),
      body: FlutterMap(
        mapController: mapController,
        options: MapOptions(
          center: LatLng(-2.134, -79.962),
          zoom: currentZoom,
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            subdomains: ['a', 'b', 'c'],
          ),
          MarkerLayer(
            markers: locations
                .where((location) => location['latitud'] != null && location['longitud'] != null)
                .map((location) {
              final isCurrentLocation = location['isCurrentLocation'] ?? false;
              print('Marcador en (${location['latitud']}, ${location['longitud']}): ${isCurrentLocation ? 'Actual' : 'Grupo'}');
              return Marker(
                point: LatLng(location['latitud'], location['longitud']),
                builder: (ctx) => Icon(
                  isCurrentLocation ? Icons.location_on : Icons.location_pin,
                  color: isCurrentLocation ? Colors.red : Colors.blue,
                ),
              );
            }).toList(),
          )
        ],
      ),
      floatingActionButton: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          FloatingActionButton(
            onPressed: updateLocation,
            tooltip: 'Actualizar mi ubicación',
            child: const Icon(Icons.my_location),
          ),
          const SizedBox(height: 10),
          FloatingActionButton(
            onPressed: zoomIn,
            tooltip: 'Acercar',
            child: const Icon(Icons.zoom_in),
          ),
          const SizedBox(height: 10),
          FloatingActionButton(
            onPressed: zoomOut,
            tooltip: 'Alejar',
            child: const Icon(Icons.zoom_out),
          ),
          const SizedBox(height: 10),
          FloatingActionButton(
            onPressed: addUserByEmail,
            tooltip: 'Agregar Usuario por Email',
            child: const Icon(Icons.add),
          ),
        ],
      ),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            const DrawerHeader(
              decoration: BoxDecoration(
                color: Colors.blue,
              ),
              child: Text('Grupos'),
            ),
            ...groups.map(
                  (group) => ListTile(
                title: Text(group),
                onTap: () {
                  onGroupChanged(group);
                  Navigator.pop(context); // Cierra el drawer
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  _RegisterPageState createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  String email = '';
  String password = '';
  String confirmPassword = '';

  Future<void> register() async {
    if (password != confirmPassword) {
      print('Las contraseñas no coinciden');
      return;
    }

    final response = await http.post(
      Uri.parse(ApiUrls.registro),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode == 200) {
      print('Registro exitoso');
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LoginPage()),
      );
    } else {
      print('Error en el registro');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Registrarse'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            TextField(
              onChanged: (value) {
                setState(() {
                  email = value;
                });
              },
              decoration: const InputDecoration(labelText: 'Email'),
            ),
            TextField(
              onChanged: (value) {
                setState(() {
                  password = value;
                });
              },
              decoration: const InputDecoration(labelText: 'Password'),
              obscureText: true,
            ),
            TextField(
              onChanged: (value) {
                setState(() {
                  confirmPassword = value;
                });
              },
              decoration: const InputDecoration(labelText: 'Confirm Password'),
              obscureText: true,
            ),
            ElevatedButton(
              onPressed: register,
              child: const Text('Registrarse'),
            ),
          ],
        ),
      ),
    );
  }
}

class ApiUrls {
  static const String base = 'http://192.168.1.43:3000';
  static const String acceso = '$base/acceso';
  static const String registro = '$base/registro';
  static const String ubicaciones = '$base/ubicaciones';
  static const String actualizarUbicacion = '$base/actualizar-ubicacion';
  static const String agregarGrupo = '$base/agregar-grupo';
  static const String usuario = '$base/usuario';
}