/**
 * Datos de plantillas de consentimiento informado para el seeder principal.
 * Contiene las 15 plantillas de consentimiento usadas en el sistema.
 * Importado por: prisma/seed.js
 */

function getConsentTemplatesData(getLimaDateTime) {
  return [
    {
      template_name: "Apicectomia",
      template_code: "apicectomia",
      template_category: "Cirugia",
      template_content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto;">
  <h2 style="text-align: center; font-weight: bold; margin-bottom: 30px; font-size: 14px;">CONSENTIMIENTO INFORMADO PARA LA REALIZACION DE APICECTOMIA</h2>
  <p style="text-align: justify; margin-bottom: 15px;">
    Yo .................................................................................................. (como paciente), con DNI No. ..............................,
    mayor de edad, y con domicilio en .................................................................................................. o Yo
    .................................................................................................. con DNI No. ............., mayor de edad, y con domicilio
    en .................................................................................................. en calidad de representante legal de
    .................................................................................................. <strong>DECLARO</strong> Que el Cirujano-Dentista me ha explicado
    que es conveniente en mi situacion proceder a realizar una cirugia periapical a un diente, dandome la siguiente informacion:
  </p>
  <p style="text-align: justify; margin-bottom: 10px;"><strong>1.-</strong> El proposito principal de la intervencion es eliminar restos de un proceso infeccioso, (granuloma o quiste periapical).</p>
  <p style="text-align: justify; margin-bottom: 10px;"><strong>2.-</strong> Me ha explicado que el tratamiento que voy a recibir implica la administracion de anestesia local.</p>
  <p style="text-align: justify; margin-bottom: 10px;"><strong>3.-</strong> La intervencion consiste en la incision a nivel de la mucosa, eliminacion de la tabla osea y por la ventana abierta eliminar el apice de la raiz enferma.</p>
  <p style="text-align: justify; margin-bottom: 30px;"><strong>5.-</strong> El Dentista me ha explicado que todo acto quirurgico lleva implicitas una serie de complicaciones comunes y potencialmente serias que podrian requerir tratamientos complementarios tanto medicos como quirurgicos.</p>
  <hr style="border: none; border-top: 1px solid #ccc; margin: 30px 0;">
  <p style="text-align: justify; margin-bottom: 30px;">He comprendido lo que se me ha explicado por el facultativo de forma clara, con un lenguaje sencillo. <strong>DOY MI CONSENTIMIENTO</strong> para que me practique el tratamiento de apicectomia.</p>
  <p style="margin-bottom: 50px;">En Lima, a ..........................de .....................................................de.......................</p>
  <div style="display: flex; justify-content: space-between; margin-top: 60px;">
    <div style="text-align: left;"><p>El Paciente o</p><p>Representante Legal</p></div>
    <div style="text-align: right;"><p>Cirujano-Dentista</p><p>COP ..................</p></div>
  </div>
</div>`,
      is_active: true,
      version: 1,
      status: "active",
      user_id_registration: 1,
      date_time_registration: getLimaDateTime(),
    },
    {
      template_name: "Endodoncia",
      template_code: "endodoncia",
      template_category: "Tratamiento",
      template_content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto;">
  <h2 style="text-align: center; font-weight: bold; margin-bottom: 30px; font-size: 14px;">CONSENTIMIENTO INFORMADO PARA ENDODONCIA</h2>
  <p style="text-align: justify; margin-bottom: 15px;">Yo, paciente.................................................................................................. con DNI No. .............................., mayor de edad, y con domicilio en ..................................................................................................</p>
  <p style="text-align: justify; margin-bottom: 15px;"><strong>DECLARO</strong> Que el Cirujano Dentista me ha explicado que es conveniente en mi situacion proceder a realizar el tratamiento endodontico de mi pieza dentaria.</p>
  <p style="text-align: justify; margin-bottom: 15px;"><strong>1.</strong> El proposito principal de la intervencion es la eliminacion del tejido pulpar inflamado o infectado, del interior del diente para evitar secuelas dolorosas o infecciosas.</p>
  <p style="text-align: justify; margin-bottom: 15px;"><strong>3.</strong> La intervencion consiste en la eliminacion y el relleno de la camara pulpar y los tejidos radiculares con un material que selle la cavidad e impida el paso a las bacterias y toxinas infecciosas, conservando el diente o molar.</p>
  <p style="text-align: justify; margin-bottom: 30px;">Estoy satisfecho con la informacion recibida y comprendo el alcance y riesgos de este tratamiento, y en por ello, <strong>DOY MI CONSENTIMIENTO</strong>, para que se me practique el tratamiento de endodoncia.</p>
  <p style="margin-bottom: 50px;">En Lima, a ..........................de .....................................................de.......................</p>
  <div style="display: flex; justify-content: space-between; margin-top: 60px;">
    <div style="text-align: left;"><p>El Paciente o</p><p>Representante Legal</p></div>
    <div style="text-align: right;"><p>El Odontologo / Estomatologo</p><p>COP ..................</p></div>
  </div>
</div>`,
      is_active: true, version: 1, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime(),
    },
    {
      template_name: "Exodoncia Simple",
      template_code: "exodoncia-simple",
      template_category: "Cirugia",
      template_content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto;">
  <h2 style="text-align: center; font-weight: bold; margin-bottom: 30px; font-size: 14px;">CONSENTIMIENTO INFORMADO PARA LA EXODONCIA SIMPLE</h2>
  <p style="text-align: justify; margin-bottom: 15px;">Yo .................................................................................................. (como paciente), con DNI No. .............................., mayor de edad, y con domicilio en ..................................................................................................</p>
  <p style="text-align: justify; margin-bottom: 15px;"><strong>DECLARO</strong> Que el Cirujano Dentista me ha explicado que es conveniente en mi situacion realizar la extraccion de una o mas piezas dentarias.</p>
  <p style="text-align: justify; margin-bottom: 15px;"><strong>1.-</strong> Comprendo que no mantendre esa o esas piezas dentarias y que, unicamente, podra ser sustituido por una protesis o implante.</p>
  <p style="text-align: justify; margin-bottom: 15px;"><strong>3.-</strong> La intervencion consiste en el empleo alternado de instrumental especializado quirurgico, aplicando fuerza manual, cuya finalidad es mover y finalmente extraer del alveolo la pieza o piezas dentales problema.</p>
  <p style="text-align: justify; margin-bottom: 30px;">Estoy satisfecho con la informacion recibida y comprendo el alcance y riesgos de este tratamiento, y en por ello, <strong>DOY MI CONSENTIMIENTO</strong>, para que se me practique el tratamiento de extraccion simple.</p>
  <p style="margin-bottom: 50px;">En Lima, a ..........................de .....................................................de.......................</p>
  <div style="display: flex; justify-content: space-between; margin-top: 60px;">
    <div style="text-align: left;"><p>El Paciente o</p><p>Representante Legal</p></div>
    <div style="text-align: right;"><p>El Odontologo / Estomatologo</p><p>COP ..................</p></div>
  </div>
</div>`,
      is_active: true, version: 1, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime(),
    },
    {
      template_name: "Implantes Dentales",
      template_code: "implantes",
      template_category: "Cirugia",
      template_content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto;">
  <h2 style="text-align: center; font-weight: bold; margin-bottom: 30px; font-size: 14px;">CONSENTIMIENTO INFORMADO PARA IMPLANTES DENTALES</h2>
  <p style="text-align: justify; margin-bottom: 15px;">Yo .................................................................................................. (como paciente), con DNI No. .............................., mayor de edad, y con domicilio en ..................................................................................................</p>
  <p style="text-align: justify; margin-bottom: 15px;"><strong>DECLARO</strong> Que el Cirujano Dentista me ha explicado que el proposito de la intervencion es la reposicion de los dientes perdidos mediante la fijacion de tornillos o laminas al hueso.</p>
  <p style="text-align: justify; margin-bottom: 15px;">Los implantes han sido utilizados ampliamente en todo el mundo, desde hace mas de 25 anos y es un procedimiento considerado seguro, pero existe un porcentaje de fracasos entre el 8 y el 10 por ciento.</p>
  <p style="text-align: justify; margin-bottom: 30px;">Estoy satisfecho con la informacion recibida y comprendo el alcance y riesgos de este tratamiento, y en por ello, <strong>DOY MI CONSENTIMIENTO</strong>, para que se me practique el tratamiento de implantes.</p>
  <p style="margin-bottom: 50px;">En Lima, a ..........................de .....................................................de.......................</p>
  <div style="display: flex; justify-content: space-between; margin-top: 60px;">
    <div style="text-align: left;"><p>El Paciente o</p><p>Representante Legal</p></div>
    <div style="text-align: right;"><p>El Odontologo / Estomatologo</p><p>COP ..................</p></div>
  </div>
</div>`,
      is_active: true, version: 1, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime(),
    },
    {
      template_name: "Ortodoncia",
      template_code: "ortodoncia",
      template_category: "Tratamiento",
      template_content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto;">
  <h2 style="text-align: center; font-weight: bold; margin-bottom: 30px; font-size: 14px;">CONSENTIMIENTO INFORMADO PARA ORTODONCIA</h2>
  <p style="text-align: justify; margin-bottom: 15px;">Yo .................................................................................................. (como paciente), con DNI No. .............................., mayor de edad, y con domicilio en ..................................................................................................</p>
  <p style="text-align: justify; margin-bottom: 15px;"><strong>DECLARO</strong> Que el Cirujano Dentista me ha explicado que es conveniente en mi situacion proceder a realizar un tratamiento ortodontico, con objeto de conseguir una mejor alineacion de los dientes.</p>
  <p style="text-align: justify; margin-bottom: 15px;">Para ello se emplean aparatos de ortodoncia que pueden ser removibles o fijos. El Dentista me ha explicado que los aparatos pueden producir ulceras o llagas, dolor en los dientes, y que es frecuente que con el tiempo se produzca reabsorcion de las raices.</p>
  <p style="text-align: justify; margin-bottom: 30px;">Me queda claro que en cualquier momento y sin necesidad de dar ninguna explicacion, puedo revocar este consentimiento. Estoy satisfecho con la informacion recibida y comprendo el alcance y riesgos de este tratamiento, y en por ello, <strong>DOY MI CONSENTIMIENTO</strong>, para que se me practique el tratamiento de ortodoncia.</p>
  <p style="margin-bottom: 50px;">En Lima, a ..........................de .....................................................de.......................</p>
  <div style="display: flex; justify-content: space-between; margin-top: 60px;">
    <div style="text-align: left;"><p>El Paciente o</p><p>Representante Legal</p></div>
    <div style="text-align: right;"><p>El Odontologo / Estomatologo</p><p>COP ..................</p></div>
  </div>
</div>`,
      is_active: true, version: 1, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime(),
    },
    {
      template_name: "Protesis Fija",
      template_code: "protesis-fija",
      template_category: "Rehabilitacion",
      template_content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto;">
  <h2 style="text-align: center; font-weight: bold; margin-bottom: 30px; font-size: 14px;">CONSENTIMIENTO INFORMADO PARA PROTESIS FIJA</h2>
  <p style="text-align: justify; margin-bottom: 15px;">Yo .................................................................................................. (como paciente), con DNI No. .............................., mayor de edad, y con domicilio en ..................................................................................................</p>
  <p style="text-align: justify; margin-bottom: 15px;"><strong>DECLARO</strong> Que el Cirujano Dentista me ha explicado que es conveniente en mi situacion proceder a realizar el tratamiento de protesis dental.</p>
  <p style="text-align: justify; margin-bottom: 15px;">Se me ha explicado la necesidad de tallar los dientes pilares de la protesis, lo que puede conllevar la posibilidad de aproximacion excesiva a la camara pulpar (nervio) que nos obligaria a realizar un tratamiento de endodoncia.</p>
  <p style="text-align: justify; margin-bottom: 30px;">He comprendido lo explicado de forma clara. Estoy satisfecho con la informacion recibida y he comprendido el alcance y riesgos de este tratamiento, y en por ello, <strong>DOY MI CONSENTIMIENTO</strong>, para que se me practique el tratamiento de protesis fija.</p>
  <p style="margin-bottom: 50px;">En Lima, a ..........................de .....................................................de.......................</p>
  <div style="display: flex; justify-content: space-between; margin-top: 60px;">
    <div style="text-align: left;"><p>El Paciente o</p><p>Representante Legal</p></div>
    <div style="text-align: right;"><p>El Odontologo / Estomatologo</p><p>COP ..................</p></div>
  </div>
</div>`,
      is_active: true, version: 1, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime(),
    },
    {
      template_name: "Cirugia Bucal Menor",
      template_code: "cirugia-bucal-menor",
      template_category: "Cirugia",
      template_content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto;">
  <h2 style="text-align: center; font-weight: bold; margin-bottom: 30px; font-size: 14px;">CONSENTIMIENTO INFORMADO PARA LA CIRUGIA ORAL MENOR</h2>
  <p style="text-align: justify; margin-bottom: 15px;">Yo .................................................................................................. (como paciente), con DNI No. .............................., mayor de edad, y con domicilio en ..................................................................................................</p>
  <p style="text-align: justify; margin-bottom: 15px;"><strong>DECLARO</strong> Que el Cirujano Dentista me ha explicado que el proposito de la intervencion de cirugia oral menor es para resolver alguno de los siguientes problemas de la cavidad oral: extraccion de piezas dentarias o restos apicales incluidos, frenestracion o traccion de dientes retenidos, plastia de frenillos labiales, extirpacion de quistes maxilares y pequenos tumores.</p>
  <p style="text-align: justify; margin-bottom: 30px;">Estoy satisfecho con la informacion recibida y comprendo el alcance y riesgos de este tratamiento, y en por ello, <strong>DOY MI CONSENTIMIENTO</strong>, para que se me practique el tratamiento de cirugia.</p>
  <p style="margin-bottom: 50px;">En Lima, a ..........................de .....................................................de.......................</p>
  <div style="display: flex; justify-content: space-between; margin-top: 60px;">
    <div style="text-align: left;"><p>El Paciente o</p><p>Representante Legal</p></div>
    <div style="text-align: right;"><p>El Odontologo / Estomatologo</p><p>COP ..................</p></div>
  </div>
</div>`,
      is_active: true, version: 1, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime(),
    },
    {
      template_name: "Tercer Molar",
      template_code: "tercer-molar",
      template_category: "Cirugia",
      template_content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto;">
  <h2 style="text-align: center; font-weight: bold; margin-bottom: 30px; font-size: 14px;">CONSENTIMIENTO INFORMADO PARA LA EXODONCIA DE LA TERCERA MOLAR</h2>
  <p style="text-align: justify; margin-bottom: 15px;">Yo .................................................................................................. (como paciente), con DNI No. .............................., mayor de edad, y con domicilio en ..................................................................................................</p>
  <p style="text-align: justify; margin-bottom: 15px;"><strong>DECLARO</strong> Que el Cirujano Dentista me ha explicado que es conveniente en mi situacion proceder a la extraccion de un cordal o muela de juicio por los sintomas y signos que manifiesto.</p>
  <p style="text-align: justify; margin-bottom: 15px;">Entiendo que el objetivo del procedimiento consiste en conseguir eliminar los problemas y complicaciones que su mantenimiento en la boca pueda ocasionar.</p>
  <p style="text-align: justify; margin-bottom: 30px;">Este consentimiento puede ser revocado discrecionalmente por mi, sin necesidad de justificacion alguna, en cualquier momento antes de realizar el procedimiento.</p>
  <p style="margin-bottom: 50px;">En Lima, a ..........................de .....................................................de.......................</p>
  <div style="display: flex; justify-content: space-between; margin-top: 60px;">
    <div style="text-align: left;"><p>El Paciente o</p><p>Representante Legal</p></div>
    <div style="text-align: right;"><p>El Cirujano Dentista</p><p>COP ..................</p></div>
  </div>
</div>`,
      is_active: true, version: 1, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime(),
    },
    {
      template_name: "Operatoria Dental",
      template_code: "operatoria",
      template_category: "Tratamiento",
      template_content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto;">
  <h2 style="text-align: center; font-weight: bold; margin-bottom: 30px; font-size: 14px;">CONSENTIMIENTO INFORMADO PARA OBTURACIONES</h2>
  <p style="text-align: justify; margin-bottom: 15px;">Yo .................................................................................................. (como paciente), con DNI No. .............................., mayor de edad, y con domicilio en ..................................................................................................</p>
  <p style="text-align: justify; margin-bottom: 15px;"><strong>DECLARO</strong> Que el Cirujano Dentista me ha explicado que es conveniente en mi situacion proceder a realizar una obturacion o empaste a un diente o molar.</p>
  <p style="text-align: justify; margin-bottom: 15px;"><strong>1.-</strong> El proposito principal de la intervencion es restaurar los tejidos dentarios duros y proteger la pulpa, para conservar el diente/molar y su funcion.</p>
  <p style="text-align: justify; margin-bottom: 30px;">Estoy satisfecho con la informacion recibida y comprendo el alcance y riesgos de este tratamiento, y en por ello, <strong>DOY MI CONSENTIMIENTO</strong>, para que se me practique el tratamiento de obturacion.</p>
  <p style="margin-bottom: 50px;">En Lima, a ..........................de .....................................................de.......................</p>
  <div style="display: flex; justify-content: space-between; margin-top: 60px;">
    <div style="text-align: left;"><p>El Paciente o</p><p>Representante Legal</p></div>
    <div style="text-align: right;"><p>El Odontologo / Estomatologo</p><p>COP ..................</p></div>
  </div>
</div>`,
      is_active: true, version: 1, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime(),
    },
    {
      template_name: "Tratamiento General",
      template_code: "tratamiento-general",
      template_category: "General",
      template_content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto;">
  <h2 style="text-align: center; font-weight: bold; margin-bottom: 30px; font-size: 14px;">CONSENTIMIENTO INFORMADO PARA TRATAMIENTO DE REHABILITACION ORAL</h2>
  <p style="text-align: justify; margin-bottom: 15px;">Yo .................................................................................................. (como paciente), con DNI No. .............................., mayor de edad, y con domicilio en ..................................................................................................</p>
  <p style="text-align: justify; margin-bottom: 15px;"><strong>DECLARO</strong> que he sido informado sobre los tratamientos de rehabilitacion oral que pueden incluir: obturaciones, endodoncias, protesis y otros procedimientos necesarios para mi salud bucal.</p>
  <p style="text-align: justify; margin-bottom: 15px;">El Dentista me ha explicado que todo acto odontologico lleva implicitas una serie de complicaciones comunes y potencialmente serias que podrian requerir tratamientos complementarios.</p>
  <p style="text-align: justify; margin-bottom: 30px;">Estoy satisfecho con la informacion recibida y comprendo el alcance y riesgos de este tratamiento, y en por ello, <strong>DOY MI CONSENTIMIENTO</strong>, para que se me practique el tratamiento de rehabilitacion oral.</p>
  <p style="margin-bottom: 50px;">En Lima, a ..........................de .....................................................de.......................</p>
  <div style="display: flex; justify-content: space-between; margin-top: 60px;">
    <div style="text-align: left;"><p>El Paciente o</p><p>Representante Legal</p></div>
    <div style="text-align: right;"><p>El Odontologo / Estomatologo</p><p>COP ..................</p></div>
  </div>
</div>`,
      is_active: true, version: 1, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime(),
    },
    {
      template_name: "Caninos Retenidos",
      template_code: "caninos-retenidos",
      template_category: "Cirugia",
      template_content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto;">
  <h2 style="text-align: center; font-weight: bold; margin-bottom: 30px; font-size: 14px;">CONSENTIMIENTO INFORMADO PARA LA REALIZACION DE EXODONCIA DE CANINOS INCLUIDOS O RETENIDOS</h2>
  <p style="text-align: justify; margin-bottom: 15px;">Yo .................................................................................................. (como paciente), con DNI No. .............................., mayor de edad, y con domicilio en .................................................................................................. <strong>DECLARO</strong> Que el Odontologo/Estomatologo me ha explicado que es conveniente en mi situacion proceder a la extraccion de un canino o colmillo incluido dentro del maxilar.</p>
  <p style="text-align: justify; margin-bottom: 10px;"><strong>1.-</strong> El proposito principal de la intervencion es evitar que la evolucion derive en un quiste folicular o en desarrollar un ameloblastoma u otro tumor o dano en otros dientes.</p>
  <p style="text-align: justify; margin-bottom: 10px;"><strong>2.-</strong> Me ha explicado que el tratamiento que voy a recibir implica la administracion de anestesia local.</p>
  <p style="text-align: justify; margin-bottom: 10px;"><strong>3.-</strong> La intervencion consiste en la realizacion de una incision en la mucosa, posterior despegamiento y eliminacion del hueso que cubre el canino, para que de esta manera se pueda, con instrumental apropiado, eliminarlo.</p>
  <p style="text-align: justify; margin-bottom: 30px;"><strong>5.-</strong> El Dentista me ha explicado que todo acto quirurgico lleva implicitas una serie de complicaciones comunes y potencialmente serias que podrian requerir tratamientos complementarios. <strong>DOY MI CONSENTIMIENTO</strong>, para que se me practique el tratamiento de caninos incluidos.</p>
  <p style="margin-bottom: 50px;">En Lima, a ..........................de .....................................................de.......................</p>
  <div style="display: flex; justify-content: space-between; margin-top: 60px;">
    <div style="text-align: left;"><p>El Paciente o</p><p>Representante Legal</p></div>
    <div style="text-align: right;"><p>El Odontologo / Estomatologo</p><p>COP ..................</p></div>
  </div>
</div>`,
      is_active: true, version: 1, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime(),
    },
    {
      template_name: "Cirugia Tercera Molar",
      template_code: "cirugia-tercera-molar",
      template_category: "Cirugia",
      template_content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto;">
  <h2 style="text-align: center; font-weight: bold; margin-bottom: 30px; font-size: 14px;">CONSENTIMIENTO INFORMADO PARA EXODONCIA QUIRURGICA DE TERCEROS MOLARES INCLUIDOS</h2>
  <p style="text-align: justify; margin-bottom: 15px;">Yo, .................................................................................................. <strong>COMO PACIENTE</strong>, en pleno uso de mis facultades, libre y voluntariamente, DECLARO que he sido debidamente INFORMADO/A, por el cirujano abajo firmante, y en consecuencia, le AUTORIZO junto con sus colaboradores, para que me sea realizado el procedimiento denominado..................................................................................................</p>
  <p style="text-align: justify; margin-bottom: 15px;">La extraccion de las muelas del juicio incluidas esta indicada en ocasiones para evitar problemas como: dolor, inflamacion, infeccion, formacion de quistes, enfermedad periodontal, caries, maloclusion, perdida prematura de otros dientes.</p>
  <p style="text-align: justify; margin-bottom: 15px;">Este procedimiento se realiza con el fin de conseguir un indudable beneficio, sin embargo, no esta exento de POSIBLES COMPLICACIONES:</p>
  <ul style="margin-left: 20px; margin-bottom: 15px;">
    <li style="margin-bottom: 5px;">- Alergia al anestesico u otro medicamento utilizado.</li>
    <li style="margin-bottom: 5px;">- Hematoma e hinchazon de la region. - Hemorragia postoperatoria. - Infeccion postoperatoria.</li>
    <li style="margin-bottom: 5px;">- Apertura de los puntos de sutura.</li>
    <li style="margin-bottom: 5px;">- Dano a los dientes o tejidos vecinos.</li>
    <li style="margin-bottom: 5px;">- Falta de sensibilidad parcial o total del nervio dentario inferior.</li>
  </ul>
  <p style="text-align: justify; margin-bottom: 30px;">Este consentimiento puede ser revocado discrecionalmente por mi, sin necesidad de justificacion alguna, en cualquier momento antes de realizar el procedimiento.</p>
  <p style="margin-bottom: 50px;">En Lima, a ..........................de .....................................................de.......................</p>
  <div style="display: flex; justify-content: space-between; margin-top: 60px;">
    <div style="text-align: left;"><p>El Paciente o</p><p>Representante Legal</p></div>
    <div style="text-align: right;"><p>El Cirujano Dentista</p><p>COP ..................</p></div>
  </div>
</div>`,
      is_active: true, version: 1, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime(),
    },
    {
      template_name: "Cirugia Apical",
      template_code: "cirugia-apical",
      template_category: "Cirugia",
      template_content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto;">
  <h2 style="text-align: center; font-weight: bold; margin-bottom: 30px; font-size: 14px;">CONSENTIMIENTO INFORMADO PARA LA REALIZACION DE LA CIRUGIA PERIAPICAL Y APICECTOMIA</h2>
  <p style="text-align: justify; margin-bottom: 15px;">Yo, .................................................................................................. <strong>COMO PACIENTE</strong>, en pleno uso de mis facultades, libre y voluntariamente, DECLARO que he sido debidamente INFORMADO/A, por el cirujano abajo firmante, y en consecuencia, le AUTORIZO junto con sus colaboradores, para que me sea realizado el procedimiento.</p>
  <p style="text-align: justify; margin-bottom: 15px;">La cirugia oral se hace necesaria para el tratamiento de muy diversas problemas y patologias de la cavidad oral. Entre dichas patologias se encuentran las lesiones periapicales y de los apices radiculares de los diversos dientes.</p>
  <p style="text-align: justify; margin-bottom: 15px;">La apicectomia es la extirpacion del extremo final de una raiz dental, con limpieza de la cavidad residual y obturacion y sellado de las condiciones radiculares cuando es necesario para su curacion.</p>
  <p style="text-align: justify; margin-bottom: 15px;">Complicaciones posibles:</p>
  <ul style="margin-left: 20px; margin-bottom: 15px;">
    <li style="margin-bottom: 5px;">Alergia al anestesico, o medicaciones utilizadas.</li>
    <li style="margin-bottom: 5px;">Hematoma, hemorragia e inflamacion postoperatoria.</li>
    <li style="margin-bottom: 5px;">Infeccion postoperatoria del lecho quirurgico.</li>
    <li style="margin-bottom: 5px;">Falta de sensibilidad parcial o total del nervio dentario inferior.</li>
    <li style="margin-bottom: 5px;">Sinusitis y comunicacion bucosinusal.</li>
  </ul>
  <p style="text-align: justify; margin-bottom: 30px;">Este consentimiento puede ser revocado por mi sin necesidad de justificacion alguna, en cualquier momento antes de realizar el procedimiento.</p>
  <p style="margin-bottom: 50px;">En Lima, a ..........................de .....................................................de.......................</p>
  <div style="display: flex; justify-content: space-between; margin-top: 60px;">
    <div style="text-align: left;"><p>El Paciente o</p><p>Representante Legal</p></div>
    <div style="text-align: right;"><p>El Odontologo / Estomatologo</p><p>COP ..................</p></div>
  </div>
</div>`,
      is_active: true, version: 1, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime(),
    },
    {
      template_name: "Cirugia Ortognatica",
      template_code: "cirugia-ortognatica",
      template_category: "Cirugia",
      template_content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto;">
  <h2 style="text-align: center; font-weight: bold; margin-bottom: 30px; font-size: 14px;">CONSENTIMIENTO INFORMADO PARA LA CIRUGIA ORTOGNATICA O DE LAS DEFORMIDADES DENTOFACIALES</h2>
  <p style="text-align: justify; margin-bottom: 15px;">Yo .................................................................................................. (como paciente), con DNI No. .............................., mayor de edad, y con domicilio en ..................................................................................................</p>
  <p style="text-align: justify; margin-bottom: 15px;">La cirugia ortognatica se realiza para corregir la posicion de los huesos maxilares, con los consiguientes beneficios esteticos y/o funcionales. Se realiza mediante osteotomias (cortes) en los huesos de la cara y su posterior recolocacion en la posicion adecuada.</p>
  <p style="text-align: justify; margin-bottom: 15px;">Este procedimiento no esta exento de POSIBLES COMPLICACIONES:</p>
  <ul style="margin-left: 20px; margin-bottom: 15px;">
    <li style="margin-bottom: 5px;">- Hematoma e inflamacion postoperatoria.</li>
    <li style="margin-bottom: 5px;">- Hemorragia intra o postoperatoria.</li>
    <li style="margin-bottom: 5px;">- Infeccion postoperatoria.</li>
    <li style="margin-bottom: 5px;">- Falta de sensibilidad parcial o total de los labios, menton, mejilla.</li>
    <li style="margin-bottom: 5px;">- Recidiva de la deformidad.</li>
  </ul>
  <p style="text-align: justify; margin-bottom: 30px;">Yo, .................................................................................................. <strong>COMO PACIENTE</strong>, en pleno uso de mis facultades, libre y voluntariamente, DECLARO que he sido debidamente INFORMADO/A, y <strong>DOY MI CONSENTIMIENTO</strong> para el procedimiento.</p>
  <p style="margin-bottom: 50px;">En Lima, a ..........................de .....................................................de.......................</p>
  <div style="display: flex; justify-content: space-between; margin-top: 60px;">
    <div style="text-align: left;"><p>El Paciente o</p><p>Representante Legal</p></div>
    <div style="text-align: right;"><p>El Odontologo / Estomatologo</p><p>COP ..................</p></div>
  </div>
</div>`,
      is_active: true, version: 1, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime(),
    },
    {
      template_name: "Periodoncia",
      template_code: "periodoncia",
      template_category: "Tratamiento",
      template_content: `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto;">
  <h2 style="text-align: center; font-weight: bold; margin-bottom: 30px; font-size: 14px;">CONSENTIMIENTO INFORMADO PARA TRATAMIENTO PERIODONTAL</h2>
  <p style="text-align: justify; margin-bottom: 15px;">Yo .................................................................................................. (como paciente), con DNI No. .............................., mayor de edad, y con domicilio en ..................................................................................................</p>
  <p style="text-align: justify; margin-bottom: 15px;"><strong>DECLARO</strong> Que el Cirujano Dentista me ha explicado que es conveniente en mi situacion proceder a realizar tratamiento periodontal para tratar la enfermedad de las encias y tejidos de soporte dental.</p>
  <p style="text-align: justify; margin-bottom: 15px;"><strong>1.-</strong> El proposito principal de la intervencion es eliminar la placa bacteriana, calculo dental y tejido infectado para detener la progresion de la enfermedad periodontal.</p>
  <p style="text-align: justify; margin-bottom: 15px;"><strong>2.-</strong> El tratamiento puede incluir: raspado y alisado radicular, cirugia periodontal, injertos de tejido, y procedimientos regenerativos segun sea necesario.</p>
  <p style="text-align: justify; margin-bottom: 15px;"><strong>3.-</strong> Posibles complicaciones incluyen: sensibilidad dental temporal, sangrado, inflamacion, y en casos raros, infeccion postoperatoria.</p>
  <p style="text-align: justify; margin-bottom: 30px;">Estoy satisfecho con la informacion recibida y comprendo el alcance y riesgos de este tratamiento, y en por ello, <strong>DOY MI CONSENTIMIENTO</strong>, para que se me practique el tratamiento periodontal.</p>
  <p style="margin-bottom: 50px;">En Lima, a ..........................de .....................................................de.......................</p>
  <div style="display: flex; justify-content: space-between; margin-top: 60px;">
    <div style="text-align: left;"><p>El Paciente o</p><p>Representante Legal</p></div>
    <div style="text-align: right;"><p>El Odontologo / Estomatologo</p><p>COP ..................</p></div>
  </div>
</div>`,
      is_active: true, version: 1, status: "active", user_id_registration: 1, date_time_registration: getLimaDateTime(),
    },
  ];
}

module.exports = { getConsentTemplatesData };
