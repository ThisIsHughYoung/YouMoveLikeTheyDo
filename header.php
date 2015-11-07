<?php
require_once 'include/Mobile_Detect.php';
$detect = new Mobile_Detect;
 
// Any mobile device (phones or tablets).
if ( $detect->isMobile() ) {
	readfile('mobile.html');
	die();
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="description" content="">
	<meta name="author" content="">
	<title>You Move Like They Do!</title>
	
	<!-- CSS -->
	<link rel="stylesheet" type="text/css" href="css/style.css">
	
	<!-- JS -->
</head>
<body>