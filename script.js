// Instagram Follow Management Tool
// Versión mejorada con opciones de ver seguidores y seguidos

function parseFetchString(fetchString) {
	try {
		console.log("🔍 Procesando datos del fetch...");
		const cleanStr = fetchString.trim().replace(/;$/, '');
		const urlMatch = cleanStr.match(/fetch\("([^"]+)",\s*\{/);
		if (!urlMatch) throw new Error("No se pudo extraer la URL");
		const url = urlMatch[1];

		const configStart = cleanStr.indexOf('{');
		const configEnd = cleanStr.lastIndexOf('}') + 1;
		if (configStart === -1 || configEnd === 0) throw new Error("No se pudo extraer la configuración");

		const configStr = cleanStr.slice(configStart, configEnd);
		const config = JSON.parse(configStr);

		return { url, config };
	} catch (error) {
		console.error('❌ Error al analizar el fetch:', error);
		return null;
	}
}

async function startProcess() {
	console.log('🌟 Instagram Follow Management Tool 🌟');
	console.log('🔄 Iniciando proceso...');

	const fetchString = prompt("Pega el fetch copiado del inspector de red:");
	if (!fetchString) return;

	const parsed = parseFetchString(fetchString);
	if (!parsed) {
		alert('❌ Error procesando el fetch. Asegúrate de copiarlo completo.');
		return;
	}

	const userIdMatch = parsed.url.match(/friendships\/(\d+)/);
	const userId = userIdMatch ? userIdMatch[1] : 'self';

	const apiConfig = {
		userId,
		baseHeaders: parsed.config.headers,
		referrer: parsed.config.referrer,
		credentials: parsed.config.credentials,
		mode: parsed.config.mode
	};

	const option = prompt("Selecciona una opción:\n1. Ver lista de quienes no te siguen\n2. Dejar de seguir a quienes no te siguen (excluyendo verificados)\n3. Dejar de seguir a TODOS los que no te siguen (incluyendo verificados)\n4. Ver lista de seguidores\n5. Ver lista de seguidos\n\nIngresa el número de tu opción (1-5):");

	switch (option) {
		case '1':
			await showNonFollowers(apiConfig);
			break;
		case '2':
			await unfollowNonFollowers(apiConfig, true);
			break;
		case '3':
			await unfollowNonFollowers(apiConfig, false);
			break;
		case '4':
			await showFollowers(apiConfig);
			break;
		case '5':
			await showFollowing(apiConfig);
			break;
		default:
			alert('Opción no válida');
	}
}

async function showNonFollowers(config) {
	console.log('🔎 Obteniendo lista de no seguidores...');
	const nonFollowers = await getNonFollowers(config, true);
	displayUsers(nonFollowers, 'No seguidores');
}

async function showFollowers(config) {
	console.log('🔎 Obteniendo lista de seguidores...');
	const followers = await getUsers(config, 'followers', 12, false);
	displayUsers(followers, 'Seguidores');
}

async function showFollowing(config) {
	console.log('🔎 Obteniendo lista de seguidos...');
	const following = await getUsers(config, 'following', 200, false);
	displayUsers(following, 'Seguidos');
}

async function displayUsers(users, title) {
	console.log(`📜 Mostrando lista de ${title}...`);
	const viewOption = prompt(`¿Cómo deseas ver la lista de ${title}?\n1. Como tabla\n2. Solo nombres en array\n3. Exportar como CSV\nIngresa 1, 2 o 3:`);

	if (viewOption === '1') {
		console.table(users.map(u => ({ Usuario: `@${u.username}`, Verificado: u.is_verified ? 'Sí' : 'No' })));
	} else if (viewOption === '2') {
		console.log(users.map(u => u.username));
	} else if (viewOption === '3') {
		// Cabecera
		const csvHeaders = ['id', 'username', 'is_verified', 'profile_url'];
		const csvRows = users.map(u => [
			u.id,
			u.username,
			u.is_verified ? 'Sí' : 'No',
			`https://instagram.com/${u.username}`
		]);

		const csvContent = [
			csvHeaders.join(','),
			...csvRows.map(row => row.map(val => `"${val}"`).join(','))
		].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `${title.replace(/\s+/g, '_')}_usuarios.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);

		alert(`Archivo CSV generado correctamente con ${users.length} cuentas.`);
	} else {
		alert('Opción no válida. Mostrando como tabla por defecto.');
		console.table(users.map(u => ({ Usuario: `@${u.username}`, Verificado: u.is_verified ? 'Sí' : 'No' })));
	}

	alert(`Revisa la consola o el archivo descargado para ver la lista de ${users.length} cuentas.`);
}



async function unfollowNonFollowers(config, excludeVerified) {
	console.log('🚨 Preparando para dejar de seguir cuentas...');
	const nonFollowers = await getNonFollowers(config, excludeVerified);
	if (nonFollowers.length === 0) return alert('🎉 No hay cuentas para dejar de seguir!');
	displayUsers(nonFollowers, 'Cuentas que no te siguen');
	if (confirm(`¿Dejar de seguir a ${nonFollowers.length} cuentas?`)) {
		await executeUnfollows(config, nonFollowers);
		alert(`✅ Proceso completado! Se dejaron de seguir ${nonFollowers.length} cuentas.`);
	}
}

async function getNonFollowers(config, excludeVerified) {
	const [followers, following] = await Promise.all([
		getUsers(config, 'followers', 12, false),
		getUsers(config, 'following', 200, excludeVerified)
	]);

	const followerIds = followers.map(f => f.id);
	return following.filter(u => !followerIds.includes(u.id));
}

async function getUsers(config, type, count, excludeVerified) {
	let results = [], nextId = null;
	const baseUrl = `https://www.instagram.com/api/v1/friendships/${config.userId}/${type}/?count=${count}`;

	do {
		const url = nextId ? `${baseUrl}&max_id=${nextId}` : baseUrl;
		const response = await fetch(url, {
			headers: config.baseHeaders,
			referrer: config.referrer,
			credentials: config.credentials,
			mode: config.mode
		});
		const data = await response.json();

		results.push(...data.users
			.filter(u => excludeVerified ? !u.is_verified : true)
			.map(u => ({ id: u.pk, username: u.username, is_verified: u.is_verified })));

		nextId = data.next_max_id;
		await delay(1000);
	} while (nextId);

	return results;
}

async function executeUnfollows(config, users) {
	for (let i = 0;i < users.length;i++) {
		try {
			await fetch(`https://www.instagram.com/api/v1/friendships/destroy/${users[i].id}/`, {
				method: 'POST',
				headers: { ...config.baseHeaders, 'content-type': 'application/x-www-form-urlencoded' },
				body: `user_id=${users[i].id}`,
				credentials: config.credentials
			});

			console.log(`✅ ${i + 1}/${users.length}: @${users[i].username}`);
			await delay(i % 5 === 0 ? 90000 : 30000);
		} catch (error) {
			console.error(`❌ Error con @${users[i].username}:`, error);
		}
	}
}

const delay = ms => new Promise(r => setTimeout(r, ms));

startProcess();