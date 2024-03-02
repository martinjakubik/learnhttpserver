import * as oHttp from 'http';
import * as oUrl from 'url';
import * as oFs from 'fs';
import * as oPath from 'path';

let bDebug = false;
process.argv.forEach(function (sValue, index, array) {
    if (sValue === '-d' || sValue === '--debug') {
        bDebug = true;
    }
});

let getDefaultIfBlankPath = function (sPath) {
    let sResponsePath = sPath;

    if (process.platform === 'win32') {
        if (sPath === '\\') {
            sResponsePath = oServerConfiguration.baseDirectory + '\\index.html';
        } else {
            sResponsePath = oServerConfiguration.baseDirectory + sPath;
        }
    } else {
        if (sPath === '/') {
            sResponsePath = oServerConfiguration.baseDirectory + '/index.html';
        } else {
            sResponsePath = oServerConfiguration.baseDirectory + sPath;
        }
    }

    return sResponsePath;
};

let getContentType = function (sPath) {
    let sContentType = 'text/plain';

    if (process.platform === 'win32' && sPath === oServerConfiguration.baseDirectory + '\\index.html') {
        sContentType = 'text/html';
    } else if (sPath === oServerConfiguration.baseDirectory + '/index.html') {
        sContentType = 'text/html';
    } else if (sPath.includes('.css')) {
        sContentType = 'text/css';
    } else if (sPath.includes('.html')) {
        sContentType = 'text/html';
    } else if (sPath.includes('.png')) {
        sContentType = 'image/png';
    } else if (sPath.includes('/resources/')) {
        sContentType = 'image/png';
    } else if (process.platform === 'win32' && sPath.includes('\\resources\\')) {
        sContentType = 'image/png';
    } else if (sPath.includes('.js') || sPath.includes('.mjs')) {
        sContentType = 'application/javascript';
    }

    return sContentType;
};

const sServerConfigurationFile = 'learnhttpserver.conf';
let oServerConfiguration = {
    port: 1999,
    baseDirectory: '.',
    appDirectory: 'app',
    libDirectory: 'lib',
    resourceDirectory: 'resources',
    testDirectory: 'test',
    devDirectory: 'dev',
}

const loadConfigurationFromFile = function () {
    oFs.open(sServerConfigurationFile, 'r', (oError, oFileDescriptor) => {
        if (oError) {
            if (oError.code === 'ENOENT') {
                console.error('myfile does not exist');
                return;
            }

            throw oError;
        }

        try {
            oFs.readFile(oFileDescriptor, (oError, sData) => {
                if (oError) {
                    console.error(oError.message);
                }
                if (bDebug) console.log('----');
                if (bDebug) console.log('loaded server configuration file');
                if (bDebug) console.log(`data: ${sData}`);
                const oData = JSON.parse(sData);
                if (oData.port) {
                    if (bDebug) console.log(`setting port to ${oData.port}`);
                    oServerConfiguration.port = oData.port;
                }
            });
        } finally {
            oFs.close(oFileDescriptor, (oError) => {
                if (oError) throw oError;
            });
        }
    });
}

const startServer = async function () {
    await loadConfigurationFromFile();

    oHttp.createServer(function (oRequest, oResponse) {
        try {
            let oRequestUrl = oUrl.parse(oRequest.url);

            let sPath = oRequestUrl.pathname;

            // need to use oPath.normalize so people can't access directories underneath oServerConfiguration.baseDirectory
            let sFSPath = oPath.normalize(sPath);

            let sFinalPath = getDefaultIfBlankPath(sFSPath);
            if (bDebug) console.log(`final path: ${sFinalPath}`);

            let sContentType = getContentType(sFinalPath);
            if (bDebug) console.log(`content type: ${sContentType}`);

            let oHeaders = {
                'Content-Type': sContentType
            };
            if (bDebug) console.log(`headers: ${oHeaders}`);
            if (bDebug) console.log('----');

            oResponse.writeHead(200, oHeaders);
            let oFileStream = oFs.createReadStream(sFinalPath);
            oFileStream.pipe(oResponse);
            oFileStream.on('error', function (e) {
                // assumes the file doesn't exist
                oResponse.writeHead(404);
                oResponse.end();
            });
        } catch (e) {
            oResponse.writeHead(500);

            // ends the oResponse so browsers don't hang
            oResponse.end();
            console.log(e.stack);
        }

    }).listen(process.env.PORT || oServerConfiguration.port);

    console.log(`listening on port '${oServerConfiguration.port}'`);
};

startServer();