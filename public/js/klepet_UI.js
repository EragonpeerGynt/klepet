function divElementEnostavniTekst(sporocilo) {
  //var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  //if (jeSmesko) {
    //sporocilo = sporocilo.replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace('&lt;img', '<img').replace('png\' /&gt;', 'png\' />');
var jeDinamicno = false;
  jeDinamicno |= sporocilo.indexOf( '<img' ) > -1;
  jeDinamicno |= sporocilo.indexOf( '<iframe src=\'https://www.youtube.com/embed/' ) > -1;
  if ( jeDinamicno ) {
    var regex_im = new RegExp( '(png|jpg|gif)(\'|") /&gt;', 'gi' );
    var regex_yt = new RegExp( '&lt;iframe src=\'https://www.youtube.com/embed/', 'g' );
    sporocilo = sporocilo.replace( /\</g, '&lt;' );
    sporocilo = sporocilo.replace( /\>/g, '&gt;' );
    sporocilo = sporocilo.replace( /&lt;img/g, '<img' );
    sporocilo = sporocilo.replace( regex_im, function ( ext ) { return ext.substr( 0, 4 ) + ' />'; } );
    sporocilo = sporocilo.replace( regex_yt, '<iframe src=\'https://www.youtube.com/embed/' );
    sporocilo = sporocilo.replace( /&gt;&lt;\/iframe&gt;/g, '></iframe>' );
    return $('<div style="font-weight: bold"></div>').html(sporocilo);
  } else {
    return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  sporocilo = vnosVidea(sporocilo);
  sporocilo = dodajSmeske(sporocilo);
  sporocilo = dodajanjeHtmlSlik(sporocilo);
  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

function dodajanjeHtmlSlik(vhod) {
    var zasebno = vhod.startsWith("/zasebno");
    if (zasebno) {
      vhod = vhod.substr( 0, vhod.lastIndexOf( '"' ) );
    }
    if(vhod.match(/(http:|https:)+\S+(jpg|png|gif)/gi)) {
      var temp = [];
      temp = vhod.split(/ |"/);
      for(var i = 0; i < temp.length; i++) {
        if(temp[i].match(/(http:|https:)+\S+(jpg|png|gif)/gi)) {
          vhod += '<img width=\'200\' style=\'margin-left:20px; display:block\' src=\'' + temp[i] + '\' />';
        }
      }
    }
    if (zasebno) {
      vhod += '"';
  }
return vhod;
}

function vnosVidea(vhod) {
    var zasebno = vhod.startsWith("/zasebno");
    if ( zasebno ) {
      vhod = vhod.substr( 0, vhod.lastIndexOf( '"' ) );
    }
    if(vhod.match(/(www.youtube.com)/gi)) {
      var temp = [];
      temp = vhod.split(/ |"/);
      for(var i = 0; i < temp.length; i++) {
        if(temp[i].match(/(www.youtube.com)/gi)) {
          var temp2 = [];
          temp2 = temp[i].split('=');
          vhod += ' <iframe src=\'https://www.youtube.com/embed/' + temp2[1] + '\' width=\'200\' height=\'150\' style=\'margin-left:20px; display:block\' allowfullscreen></iframe> ';
        }
      }
    }
    if(zasebno) {
      vhod += '"';
    }
    return vhod;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('dregljaj', function(rezultat) {
    $('#vsebina').jrumble();
    $('#vsebina').trigger('startRumble');
    setTimeout(function(){
       $('#vsebina').trigger('stopRumble')
    }, 1500);
        
  });
  
  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
    
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }
     
    $('#seznam-uporabnikov div').click(function() {
      document.querySelector('#poslji-sporocilo').value = '/zasebno \"' + $(this).text() + "\" ";
      $('#poslji-sporocilo').focus();
    });
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
  
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}
